import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/* useSketchSession — the host/big-screen side of the Pictionary realtime
   channel. Joins `sketch-<sessionId>`, watches Supabase Presence for the
   drawer, receives stroke broadcasts and paints them onto a <canvas>, and
   runs the 60-second round timer. See PICTIONARY_PLAN.md §4, §8. */

const SKETCH_TIME = 60; // seconds
const FALLBACK_INK = '#131313';
// Caps on UNTRUSTED inbound broadcast. The phone self-limits, but a buggy or
// hostile channel peer must not be able to grow host memory without bound.
const MAX_STROKES = 400;
const MAX_POINTS_PER_STROKE = 600;
const MAX_PTS_PER_MSG = 150;

// Paint received strokes onto the host canvas. Strokes carry normalised 0–1
// coords; here they scale to the canvas's CSS-pixel size. Line width is
// canvas-relative so a phone doodle reads well on a big screen.
function paintStrokes(ctx, w, h, strokes) {
  ctx.clearRect(0, 0, w, h);
  const lineW = Math.max(2.5, w * 0.0075);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) continue;
    ctx.strokeStyle = stroke.color || FALLBACK_INK;
    ctx.fillStyle = stroke.color || FALLBACK_INK;
    ctx.lineWidth = lineW;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0] * w, pts[0][1] * h, lineW / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
    if (pts.length === 2) {
      ctx.lineTo(pts[1][0] * w, pts[1][1] * h);
    } else {
      // Quadratic curves through midpoints — smooths a finger-drawn polyline.
      for (let i = 1; i < pts.length - 1; i++) {
        const cx = pts[i][0] * w;
        const cy = pts[i][1] * h;
        const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * w;
        const my = ((pts[i][1] + pts[i + 1][1]) / 2) * h;
        ctx.quadraticCurveTo(cx, cy, mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0] * w, last[1] * h);
    }
    ctx.stroke();
  }
}

export default function useSketchSession({ sessionId, onEnd }) {
  const canvasRef = useRef(null);
  const [subscribed, setSubscribed] = useState(false);
  const [started, setStarted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SKETCH_TIME);

  // Mutable state shared by channel callbacks + the rAF paint loop (refs so a
  // 60 fps repaint doesn't trigger React re-renders).
  const strokesRef = useRef([]);
  const strokeById = useRef(new Map());
  const dirtyRef = useRef(true);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const skipRef = useRef(() => {});
  const onEndRef = useRef(onEnd);
  // Keep the latest onEnd reachable from the channel effect without making the
  // effect depend on it (which would re-subscribe the channel every render).
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // ── Channel lifecycle: subscribe, presence, incoming strokes, timer ──
  useEffect(() => {
    const channel = supabase.channel(`sketch-${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    let timerId = 0;
    let endTimeoutId = 0;

    const send = (t, extra) =>
      channel.send({ type: 'broadcast', event: 'evt', payload: { t, ...extra } });

    // End the round exactly once (first of: drawer Done, timer 0, host Skip).
    function finishOnce(notify) {
      if (endedRef.current) return;
      endedRef.current = true;
      clearInterval(timerId);
      if (notify) send(notify);
      // brief delay so the final broadcast flushes before SketchStage unmounts
      endTimeoutId = setTimeout(() => onEndRef.current(), 180);
    }
    skipRef.current = () => finishOnce('end');

    function startRound() {
      if (startedRef.current) return;
      startedRef.current = true;
      setStarted(true);
      let left = SKETCH_TIME;
      setTimeLeft(left);
      send('timer', { r: left });
      timerId = setInterval(() => {
        left -= 1;
        const r = Math.max(0, left);
        setTimeLeft(r);
        send('timer', { r });
        if (left <= 0) {
          clearInterval(timerId);
          finishOnce('expired');
        }
      }, 1000);
    }

    channel.on('broadcast', { event: 'evt' }, ({ payload: m }) => {
      if (!m || !m.t) return;
      switch (m.t) {
        case 's': {
          if (strokeById.current.has(m.id)) break; // dedupe re-delivery
          if (strokesRef.current.length >= MAX_STROKES) break;
          const stroke = { id: m.id, color: m.color || FALLBACK_INK, points: [] };
          strokeById.current.set(m.id, stroke);
          strokesRef.current.push(stroke);
          break;
        }
        case 'p': {
          let stroke = strokeById.current.get(m.id);
          if (!stroke) {
            // lazily create — guards against a missed/late 's' message
            if (strokesRef.current.length >= MAX_STROKES) break;
            stroke = { id: m.id, color: FALLBACK_INK, points: [] };
            strokeById.current.set(m.id, stroke);
            strokesRef.current.push(stroke);
          }
          if (Array.isArray(m.pts)) {
            const room = Math.max(0, MAX_POINTS_PER_STROKE - stroke.points.length);
            for (const pt of m.pts.slice(0, Math.min(MAX_PTS_PER_MSG, room))) {
              // reject non-numeric coords so NaN never reaches the canvas
              if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
                stroke.points.push(pt);
              }
            }
          }
          break;
        }
        case 'e':
          break; // stroke end — nothing to repaint
        case 'u': {
          const removed = strokesRef.current.pop();
          if (removed) strokeById.current.delete(removed.id);
          break;
        }
        case 'c':
          strokesRef.current = [];
          strokeById.current.clear();
          break;
        case 'sync': {
          // Normalise each wire stroke into the canonical host shape rather
          // than storing the raw payload object — keeps s/p and sync congruent.
          // Bounds mirror the phone's own limits — sync is untrusted input too.
          const incoming = Array.isArray(m.strokes) ? m.strokes.slice(0, MAX_STROKES) : [];
          strokesRef.current = incoming.map((s) => ({
            id: s.id,
            color: s.color || FALLBACK_INK,
            points: Array.isArray(s.points) ? s.points.slice(0, MAX_POINTS_PER_STROKE) : [],
          }));
          strokeById.current.clear();
          for (const s of strokesRef.current) strokeById.current.set(s.id, s);
          break;
        }
        case 'done':
          finishOnce(null); // drawer finished — phone already knows
          break;
        default:
          break;
      }
      dirtyRef.current = true;
    });

    // Presence is the pairing signal — a drawer joining starts the round.
    channel.on('presence', { event: 'sync' }, () => {
      const drawerHere = Object.values(channel.presenceState())
        .flat()
        .some((p) => p.role === 'drawer');
      if (drawerHere) {
        startRound();
        setConnected(true);
      } else if (startedRef.current) {
        setConnected(false); // drawer dropped mid-round
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setSubscribed(true);
    });

    return () => {
      clearInterval(timerId);
      clearTimeout(endTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ── Canvas sizing + rAF paint loop (runs once the round has started) ──
  useEffect(() => {
    if (!started) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;

    function size() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirtyRef.current = true;
    }
    size();
    window.addEventListener('resize', size);
    window.addEventListener('orientationchange', size);

    function frame() {
      if (dirtyRef.current) {
        paintStrokes(ctx, canvas.clientWidth, canvas.clientHeight, strokesRef.current);
        dirtyRef.current = false;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      window.removeEventListener('orientationchange', size);
    };
  }, [started]);

  const skip = useCallback(() => skipRef.current(), []);

  return { canvasRef, subscribed, started, connected, timeLeft, skip };
}
