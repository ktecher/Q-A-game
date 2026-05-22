// Phone-side Pictionary drawing page. Loaded by draw.html as a Vite module
// entry — being bundled, it CAN import from src/lib (unlike public/c.html).
//
// Phase 1: local finger-drawing canvas.
// Phase 3: Supabase Realtime — strokes are broadcast live to the host big
// screen on channel `sketch-<sessionId>`; the host's round timer is mirrored
// back. See PICTIONARY_PLAN.md §4, §7.

import { decodeSketch } from '../lib/sketchEncoding';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CANVAS_PAPER } from '../lib/sketchTheme';

const BRUSH = 3.2; // stroke width, CSS px
const MAX_POINTS = 300; // per-stroke point cap (runaway-scribble guard)
const CLEAR_UNDO_MS = 400; // window after Clear during which Undo restores
const MIN_STEP_PX = 0.6; // skip points that moved less than this (payload trim)
const FLUSH_MS = 50; // batched point-broadcast cadence → ≤20 messages/sec
const CANVAS_ASPECT = 3 / 4; // drawing surface width ÷ height (portrait)

// Pen palette, keyed by the theme the host put in the QR. The canvas is
// "paper" (see CANVAS_PAPER): light = dark ink on white, dark = light ink on a
// dark surface — so strokes stay legible on the phone AND the big screen.
const PEN_COLORS = {
  light: [
    { hex: '#131313', name: 'Black' },
    { hex: '#E2483D', name: 'Red' },
    { hex: '#2F73D8', name: 'Blue' },
    { hex: '#1FA055', name: 'Green' },
    { hex: '#E0982A', name: 'Orange' },
    { hex: '#A855C7', name: 'Purple' },
  ],
  dark: [
    { hex: '#FFFFFF', name: 'White' },
    { hex: '#FF6B5E', name: 'Red' },
    { hex: '#5DA2FF', name: 'Blue' },
    { hex: '#46C877', name: 'Green' },
    { hex: '#F0B354', name: 'Orange' },
    { hex: '#C98AE0', name: 'Purple' },
  ],
};

// ─── DOM refs ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const gate = $('gate');
const reveal = $('reveal');
const drawSection = $('draw');
const errEl = $('err');
const wordPrimary = $('word-primary');
const wordSecondary = $('word-secondary');
const readyBtn = $('ready');
const catHint = $('cat-hint');
const timerEl = $('timer');
const canvas = $('canvas');
const canvasWrap = $('canvas-wrap');
const canvasBox = $('canvas-box');
const paletteEl = $('palette');
const undoBtn = $('undo');
const clearBtn = $('clear');
const doneBtn = $('done');
const toast = $('toast');
const doneOverlay = $('done-overlay');

// ─── Decode the word from the URL fragment ───────────────────────────
const payload = decodeSketch(location.hash);

// The theme the host encoded in the QR drives the drawing surface + the
// default pen, so the phone canvas matches the big screen and strokes stay
// legible. An absent/unknown theme falls back to 'light' (white paper).
const themeMode = payload && payload.theme === 'dark' ? 'dark' : 'light';
const palette = PEN_COLORS[themeMode];
let currentColor = palette[0].hex; // default pen = the theme's contrast ink
canvasBox.style.background = CANVAS_PAPER[themeMode];

if (!payload) {
  reveal.style.display = 'none';
  gate.style.display = 'none';
  errEl.classList.add('show');
} else {
  const isAr = payload.lang === 'ar';
  document.documentElement.lang = isAr ? 'ar' : 'en';
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  if (isAr) {
    wordPrimary.textContent = payload.titleAr || '';
    wordPrimary.setAttribute('dir', 'rtl');
    wordSecondary.textContent = payload.titleEn || '';
  } else {
    wordPrimary.textContent = payload.titleEn || '';
    wordPrimary.setAttribute('dir', 'ltr');
    wordSecondary.textContent = ''; // English-primary hides the secondary line
  }
  // Category hint shown in the canvas header — never the word itself.
  if (payload.catAr || payload.catEn) {
    catHint.textContent = `فئة: ${payload.catAr || payload.catEn}`;
    if (payload.catEn) {
      const en = document.createElement('span');
      en.className = 'en';
      en.textContent = ` · ${payload.catEn}`;
      catHint.appendChild(en);
    }
  }
}

// ─── Anti-spoiler gate ───────────────────────────────────────────────
function dismissGate() {
  gate.classList.add('gone');
  reveal.classList.add('revealed');
}
gate.addEventListener('click', dismissGate);
gate.addEventListener('touchstart', dismissGate, { passive: true });
gate.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') dismissGate();
});

// ─── Ready → switch to the drawing canvas + join the realtime channel ─
readyBtn.addEventListener(
  'click',
  () => {
    reveal.style.display = 'none';
    drawSection.classList.add('active');
    initCanvas();
    joinChannel();
  },
  { once: true }, // guard: a double-tap must not wire the canvas listeners twice
);

// ─── Realtime channel (Phase 3) ──────────────────────────────────────
let channel = null;
let channelReady = false;
let flushTimer = 0;
let lastTimerR = Infinity; // last mirrored timer value — detects a host restart
let pendingId = null; // stroke id of the currently buffered points
let pendingPts = []; // [[x,y],…] awaiting the next flush

const q4 = (n) => Math.round(n * 1e4) / 1e4; // 4-dp coords — trims payload

function send(t, extra) {
  if (channel && channelReady) {
    channel.send({ type: 'broadcast', event: 'evt', payload: { t, ...extra } });
  }
}

// Serialise the local strokes to the wire format ({id,color,points:[[x,y]…]}).
function wireStrokes() {
  return strokes.map((s) => ({
    id: s.id,
    color: s.color,
    points: s.points.map((p) => [q4(p.x), q4(p.y)]),
  }));
}

function joinChannel() {
  if (!isSupabaseConfigured || !payload) return; // local-only fallback
  channel = supabase.channel(`sketch-${payload.sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel.on('broadcast', { event: 'evt' }, ({ payload: m }) => {
    if (!m) return;
    if (m.t === 'timer') showTimer(m.r);
    else if (m.t === 'expired' || m.t === 'end') lockCanvas();
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channelReady = true;
      channel.track({ role: 'drawer' }); // presence — the host's "go" signal
      // recover anything drawn before the socket finished connecting
      if (strokes.length > 0) send('sync', { strokes: wireStrokes() });
    }
  });
  // Batched point flush — one {t:'p'} message per FLUSH_MS (≤20/sec).
  flushTimer = setInterval(flushPoints, FLUSH_MS);
}

function bufferPoint(strokeId, x, y) {
  if (pendingId !== null && pendingId !== strokeId) flushPoints(); // stroke changed
  pendingId = strokeId;
  pendingPts.push([q4(x), q4(y)]);
}

function flushPoints() {
  if (pendingId !== null && pendingPts.length > 0) {
    send('p', { id: pendingId, pts: pendingPts });
    pendingPts = [];
  }
}

function showTimer(r) {
  timerEl.textContent = `${r}s`;
  timerEl.classList.toggle('urgent', r <= 10);
  // A timer that jumps UP means the host re-subscribed (big-screen refresh)
  // and started a fresh round — rejoin it.
  if (r > lastTimerR) onHostRoundRestart();
  lastTimerR = r;
  if (r <= 0) lockCanvas(); // self-lock even if the {t:'expired'} is lost
}

// The host refreshed mid-round: it rejoined the channel with a blank canvas
// and a fresh 60s. Unlock if we'd already locked, and re-sync our drawing so
// the big screen shows it again — the round continues, drawing preserved.
function onHostRoundRestart() {
  if (locked) {
    locked = false;
    doneOverlay.classList.remove('show');
    doneBtn.disabled = false;
    if (!flushTimer) flushTimer = setInterval(flushPoints, FLUSH_MS);
  }
  updateButtons();
  if (strokes.length > 0) send('sync', { strokes: wireStrokes() });
}

// ─── Drawing canvas ──────────────────────────────────────────────────
// Strokes are stored in NORMALISED coords (0–1) so they map onto any display.
// Stroke shape: { id, color, w, points: [{ x, y, t }] }

const ctx = canvas.getContext('2d');
let cssW = 0;
let cssH = 0;
let canvasRect = null; // cached canvas box — the single source of truth for coords
let strokes = [];
let current = null; // the stroke being drawn right now
let activePointerId = null; // the one finger we track (extra touches are ignored)
let strokeSeq = 0;
let locked = false; // true once the round ends (Done / time-up / host End)

// Clear holds the wiped strokes briefly so Undo can restore them.
let clearBackup = null;
let clearBackupTimer = 0;
let toastTimer = 0;

// Render the pen-colour swatches. The first swatch is the theme's default ink
// (black on light paper, white on dark) and starts selected.
function buildPalette() {
  palette.forEach((color, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = i === 0 ? 'swatch selected' : 'swatch';
    btn.style.background = color.hex;
    btn.setAttribute('aria-label', `${color.name} pen`);
    btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    btn.addEventListener('click', () => {
      currentColor = color.hex;
      for (const el of paletteEl.children) {
        const on = el === btn;
        el.classList.toggle('selected', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
    paletteEl.appendChild(btn);
  });
}

function initCanvas() {
  buildPalette();
  // The wrap gets a real size as soon as #draw is shown; the canvas box is
  // sized from it. A ResizeObserver covers the first layout pass plus every
  // viewport/orientation change (it fires once when observe() is called).
  if (window.ResizeObserver) {
    new ResizeObserver(sizeCanvas).observe(canvasWrap);
  } else {
    window.addEventListener('resize', sizeCanvas);
    window.addEventListener('orientationchange', sizeCanvas);
  }
  sizeCanvas();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  undoBtn.addEventListener('click', doUndo);
  clearBtn.addEventListener('click', doClear);
  doneBtn.addEventListener('click', doDone);
  updateButtons();
}

// Cache the canvas's on-screen box — the one source of truth for mapping
// pointer coords into the 0–1 space. Refreshed on resize and at each stroke
// start, so a per-point getBoundingClientRect() (a forced reflow) is avoided.
function refreshRect() {
  canvasRect = canvas.getBoundingClientRect();
  cssW = canvasRect.width;
  cssH = canvasRect.height;
}

function sizeCanvas() {
  // Fit the largest 3:4 box inside the available wrap area, then match the
  // canvas backing store to it. The box has no intrinsic size of its own
  // (its children are absolutely positioned), so JS owns the dimensions.
  const availW = canvasWrap.clientWidth;
  const availH = canvasWrap.clientHeight;
  if (availW === 0 || availH === 0) return; // not laid out yet — observer re-fires
  let boxW = availW;
  let boxH = boxW / CANVAS_ASPECT;
  if (boxH > availH) {
    boxH = availH;
    boxW = boxH * CANVAS_ASPECT;
  }
  canvasBox.style.width = `${Math.round(boxW)}px`;
  canvasBox.style.height = `${Math.round(boxH)}px`;

  const dpr = window.devicePixelRatio || 1;
  refreshRect();
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // Draw in CSS pixels; the transform scales to the device's pixel grid.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function clamp01(n) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// Append a normalised point to a stroke. Returns true if a point was added.
function addPoint(stroke, ev) {
  if (stroke.points.length >= MAX_POINTS) return false;
  const x = clamp01((ev.clientX - canvasRect.left) / canvasRect.width);
  const y = clamp01((ev.clientY - canvasRect.top) / canvasRect.height);
  const last = stroke.points[stroke.points.length - 1];
  if (
    last &&
    Math.abs(last.x - x) * cssW < MIN_STEP_PX &&
    Math.abs(last.y - y) * cssH < MIN_STEP_PX
  ) {
    return false; // barely moved — skip
  }
  stroke.points.push({ x, y, t: Math.round(performance.now() - stroke.start) });
  return true;
}

function onPointerDown(e) {
  if (locked || activePointerId !== null) return; // ignore extra fingers
  activePointerId = e.pointerId;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* capture unavailable — drawing still works without it */
  }
  refreshRect(); // fresh box → accurate coords for this stroke
  current = { id: ++strokeSeq, color: currentColor, w: BRUSH, points: [], start: performance.now() };
  addPoint(current, e);
  strokes.push(current);
  send('s', { id: current.id, color: currentColor, w: BRUSH });
  const first = current.points[0];
  if (first) bufferPoint(current.id, first.x, first.y);
  updateButtons();
}

function onPointerMove(e) {
  if (locked || !current || e.pointerId !== activePointerId) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events) {
    if (addPoint(current, ev)) {
      drawLastSegment(current);
      const p = current.points[current.points.length - 1];
      bufferPoint(current.id, p.x, p.y);
    }
  }
}

function onPointerUp(e) {
  if (!current || e.pointerId !== activePointerId) return;
  releaseActive(e.pointerId);
  if (current.points.length === 1) drawDot(current, current.points[0]);
  flushPoints();
  send('e', { id: current.id });
  current = null;
  updateButtons();
}

// pointercancel = the OS took the pointer (incoming call, palm rejection, a
// system gesture). Discard the half-drawn stroke locally and on the wire.
function onPointerCancel(e) {
  if (!current || e.pointerId !== activePointerId) return;
  releaseActive(e.pointerId);
  strokes.pop();
  current = null;
  pendingId = null;
  pendingPts = [];
  send('u'); // drop the partial stroke on the big screen too
  redraw();
  updateButtons();
}

function releaseActive(pointerId) {
  activePointerId = null;
  try {
    canvas.releasePointerCapture(pointerId);
  } catch {
    /* pointer already released — ignore */
  }
}

// Draw the most recent segment of a stroke (live, incremental — no full redraw).
function drawLastSegment(stroke) {
  const pts = stroke.points;
  if (pts.length < 2) return; // a lone point is rendered as a dot on pointerup
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x * cssW, a.y * cssH);
  ctx.lineTo(b.x * cssW, b.y * cssH);
  ctx.stroke();
}

function drawDot(stroke, p) {
  if (!p) return;
  ctx.fillStyle = stroke.color;
  ctx.beginPath();
  ctx.arc(p.x * cssW, p.y * cssH, stroke.w / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Full repaint — used after Undo/Clear/resize.
function redraw() {
  ctx.clearRect(0, 0, cssW, cssH);
  for (const stroke of strokes) {
    if (stroke.points.length === 1) {
      drawDot(stroke, stroke.points[0]);
      continue;
    }
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * cssW;
      const y = p.y * cssH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function doUndo() {
  if (locked) return;
  if (clearBackup) {
    // Undo right after Clear restores everything — push the full state to the
    // big screen with {t:'sync'} since it was already cleared.
    strokes = clearBackup;
    clearBackup = null;
    clearTimeout(clearBackupTimer);
    send('sync', { strokes: wireStrokes() });
  } else if (strokes.length > 0) {
    strokes.pop();
    send('u');
  }
  redraw();
  updateButtons();
}

function doClear() {
  if (locked || strokes.length === 0) return;
  clearBackup = strokes;
  strokes = [];
  redraw();
  updateButtons();
  showToast('مسح · Cleared');
  send('c');
  clearTimeout(clearBackupTimer);
  clearBackupTimer = setTimeout(() => {
    clearBackup = null;
    updateButtons();
  }, CLEAR_UNDO_MS);
}

function doDone() {
  if (locked) return;
  flushPoints();
  send('done');
  lockCanvas();
}

// Lock the canvas — drawer tapped Done, or the host's timer expired/ended.
function lockCanvas() {
  if (locked) return;
  locked = true;
  current = null;
  clearInterval(flushTimer);
  flushTimer = 0;
  doneOverlay.classList.add('show');
  undoBtn.disabled = true;
  clearBtn.disabled = true;
  doneBtn.disabled = true;
}

function updateButtons() {
  if (locked) return;
  undoBtn.disabled = strokes.length === 0 && !clearBackup;
  clearBtn.disabled = strokes.length === 0;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), CLEAR_UNDO_MS);
}
