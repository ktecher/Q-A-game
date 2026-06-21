import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/* useSketchSession — the host/big-screen side of ONE Pictionary drawing
   session. Joins `sketch-<sessionId>`, watches Supabase Presence for that
   team's drawer, receives stroke broadcasts and paints them onto a <canvas>,
   and mirrors the shared round timer back to the phone.

   The head-to-head sketch challenge runs TWO of these at once (one per team).
   The round timer is owned by SketchStage and passed in via `timeLeft`, so
   both teams count down together off a single clock. */

const SKETCH_ASPECT = 3 / 4; // canvas width ÷ height — matches the phone surface
const FALLBACK_INK = '#131313'; // light-theme fallback ink (dark theme uses white)
// Caps on UNTRUSTED inbound broadcast. The phone self-limits, but a buggy or
// hostile channel peer must not be able to grow host memory without bound.
const MAX_STROKES = 400;
const MAX_POINTS_PER_STROKE = 600;
const MAX_PTS_PER_MSG = 150;

// Paint received strokes onto the host canvas. Strokes carry normalised 0–1
// coords; here they scale to the canvas's CSS-pixel size. Line width is
// canvas-relative so a phone doodle reads well on a big screen. `fallbackInk`
// colours any stroke that arrived without one (e.g. a dropped 's' message).
function paintStrokes(ctx, w, h, strokes, fallbackInk) {
  ctx.clearRect(0, 0, w, h);
  const lineW = Math.max(2.5, w * 0.0075);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) continue;
    const ink = stroke.color || fallbackInk;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
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

/**
 * @param {object}  opts
 * @param {string}  opts.sessionId — realtime channel id for this team
 * @param {boolean} opts.isDark    — host theme (drives the fallback ink)
 * @param {number|null} opts.timeLeft — shared countdown; null while waiting.
 *   Broadcast to the phone whenever it changes so the drawer sees the clock.
 * @param {boolean} opts.ended     — once true, tells the phone to lock.
 */
export default function useSketchSession({ sessionId, isDark, timeLeft, ended }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const [subscribed, setSubscribed] = useState(false);
  const [connected, setConnected] = useState(false);
  // Latches true on the FIRST drawer connect and never flips back (for this
  // session). The paint loop is gated on this instead of `connected` so a
  // transient presence-sync drop mid-round doesn't tear down the rAF loop and
  // blank the live drawing — the canvas stays mounted via SketchStage's
  // `started`, so it must keep being painted. Reset only when the channel
  // itself resets (new sessionId).
  const [everConnected, setEverConnected] = useState(false);

  // Mutable state shared by channel callbacks + the rAF paint loop (refs so a
  // 60 fps repaint doesn't trigger React re-renders).
  const strokesRef = useRef([]);
  const strokeById = useRef(new Map());
  const dirtyRef = useRef(true);
  const isDarkRef = useRef(isDark);
  const channelRef = useRef(null); // set once SUBSCRIBED — used to send timer/end
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // ── Channel lifecycle: subscribe, presence, incoming strokes ──
  useEffect(() => {
    if (!sessionId) return undefined; // no session yet — nothing to join
    const channel = supabase.channel(`sketch-${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    strokesRef.current = [];
    strokeById.current = new Map();
    dirtyRef.current = true;

    channel.on('broadcast', { event: 'evt' }, ({ payload: m }) => {
      if (!m || !m.t) return;
      switch (m.t) {
        case 's': {
          if (strokeById.current.has(m.id)) break; // dedupe re-delivery
          if (strokesRef.current.length >= MAX_STROKES) break;
          // Store the raw colour (may be undefined) — paintStrokes applies the
          // theme-aware fallback so a colourless stroke still shows up.
          const stroke = { id: m.id, color: m.color, points: [] };
          strokeById.current.set(m.id, stroke);
          strokesRef.current.push(stroke);
          break;
        }
        case 'p': {
          let stroke = strokeById.current.get(m.id);
          if (!stroke) {
            // lazily create — guards against a missed/late 's' message
            if (strokesRef.current.length >= MAX_STROKES) break;
            stroke = { id: m.id, color: undefined, points: [] };
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
            color: s.color,
            points: Array.isArray(s.points) ? s.points.slice(0, MAX_POINTS_PER_STROKE) : [],
          }));
          strokeById.current.clear();
          for (const s of strokesRef.current) strokeById.current.set(s.id, s);
          break;
        }
        case 'done':
          break; // a drawer finishing early no longer ends the shared round
        default:
          break;
      }
      dirtyRef.current = true;
    });

    // Presence is the pairing signal — reflects whether this team's drawer is on.
    channel.on('presence', { event: 'sync' }, () => {
      const drawerHere = Object.values(channel.presenceState())
        .flat()
        .some((p) => p.role === 'drawer');
      setConnected(drawerHere);
      // Latch the paint loop on at the first connect; it never flips back for
      // this session, so a later presence flicker can't blank the live drawing.
      if (drawerHere) setEverConnected(true);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        setSubscribed(true);
      }
    });

    return () => {
      channelRef.current = null;
      setSubscribed(false);
      setConnected(false);
      setEverConnected(false);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ── Mirror the shared round timer to the phone ──
  // SketchStage owns the countdown; rebroadcasting each tick keeps the drawer's
  // on-phone clock in sync (and a phone that joins late catches up within 1s).
  // `timeLeft` is null until the round starts, so nothing is sent while waiting.
  useEffect(() => {
    if (timeLeft == null || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'evt',
      payload: { t: 'timer', r: timeLeft },
    });
  }, [timeLeft]);

  // ── Tell the phone the round is over so it locks its canvas ──
  // Re-broadcast on a short interval: a single 'end' can be dropped, and there
  // are no more timer ticks after the round to self-heal a phone still waiting.
  useEffect(() => {
    if (!ended) return undefined;
    const sendEnd = () => {
      if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'evt', payload: { t: 'end' } });
      }
    };
    sendEnd();
    const id = setInterval(sendEnd, 400);
    return () => clearInterval(id);
  }, [ended]);

  // ── Canvas sizing + rAF paint loop (runs once this team's drawer connects) ──
  // Gated on `everConnected` (latched) not `connected` (live) — a presence
  // flicker mid-round must not tear down the loop and blank the drawing.
  useEffect(() => {
    if (!everConnected) return undefined;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;

    // Fit the largest 3:4 box inside its wrap, then match the canvas backing
    // store to it. The box carries no intrinsic size (a CSS aspect-ratio box
    // would collapse), so the dimensions are computed here from the wrap.
    function size() {
      const wrap = box.parentElement;
      if (!wrap) return;
      const availW = wrap.clientWidth;
      const availH = wrap.clientHeight;
      if (availW === 0 || availH === 0) return; // not laid out yet
      let boxW = availW;
      let boxH = boxW / SKETCH_ASPECT;
      if (boxH > availH) {
        boxH = availH;
        boxW = boxH * SKETCH_ASPECT;
      }
      box.style.width = `${Math.round(boxW)}px`;
      box.style.height = `${Math.round(boxH)}px`;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirtyRef.current = true;
    }
    size();

    // ResizeObserver covers the first layout pass plus every viewport change.
    let observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(size);
      observer.observe(box.parentElement);
    } else {
      window.addEventListener('resize', size);
      window.addEventListener('orientationchange', size);
    }

    function frame() {
      if (dirtyRef.current) {
        paintStrokes(
          ctx,
          canvas.clientWidth,
          canvas.clientHeight,
          strokesRef.current,
          isDarkRef.current ? '#ffffff' : FALLBACK_INK,
        );
        dirtyRef.current = false;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', size);
        window.removeEventListener('orientationchange', size);
      }
    };
  }, [everConnected]);

  return { canvasRef, boxRef, subscribed, connected };
}
