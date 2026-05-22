// URL-fragment encoding for the Pictionary (sketch) challenge.
// The host's SketchStage renders a QR whose URL fragment carries the word to
// draw plus a realtime session id; the phone page (`draw.html` →
// `src/draw/main.js`) decodes it, shows the word, and later joins the
// Supabase Realtime channel `sketch-<sessionId>`.
//
// Like charadesEncoding.js, the fragment (after `#`) is never sent to the
// server, so the secret word never appears in access logs.
//
// Unlike public/c.html, the phone page here is a Vite-bundled module and CAN
// import this file directly — so there is no decode logic to keep duplicated.

const PAYLOAD_VERSION = 1;

/**
 * Generate a short session id used as the realtime channel name.
 *
 * Deliberately NOT `crypto.randomUUID()` — that is `undefined` on non-secure
 * origins (e.g. `http://<lan-ip>:5173`), which is exactly where phones are
 * tested in development. 8 hex chars (~32 bits) is ample for one venue.
 */
export function makeSessionId() {
  // Prefer a CSPRNG. crypto.getRandomValues IS available on insecure origins
  // (unlike crypto.randomUUID), so the LAN-dev case still works; fall back to
  // Math.random only if crypto is somehow absent.
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(4));
    return Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

/**
 * Encode a sketch payload as a base64url string.
 * The caller prepends `d=` to get the QR URL's fragment value.
 *
 * @param {object} input
 * @param {string} input.titleAr — Arabic word to draw
 * @param {string} input.titleEn — English word to draw
 * @param {'ar' | 'en'} input.lang — which language is the primary display
 * @param {string} input.sessionId — realtime channel id (see makeSessionId)
 * @param {string} [input.catAr] — Arabic category label (faint on-canvas hint)
 * @param {string} [input.catEn] — English category label
 * @param {'dark' | 'light'} [input.theme] — host's theme; drives the phone
 *   canvas paper + default pen colour so both screens stay legible
 */
export function encodeSketch({ titleAr, titleEn, lang, sessionId, catAr, catEn, theme }) {
  const payload = { v: PAYLOAD_VERSION, ar: titleAr, en: titleEn, l: lang, s: sessionId };
  if (catAr) payload.ca = catAr;
  if (catEn) payload.ce = catEn;
  if (theme === 'dark' || theme === 'light') payload.t = theme;
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url fragment back to the sketch payload.
 * Accepts a raw token, a `d=…` fragment, or a `#d=…` fragment for convenience.
 * Returns `null` on any error so the phone page can show "invalid link".
 */
export function decodeSketch(fragment) {
  if (!fragment) return null;
  let s = fragment;
  if (s.startsWith('#')) s = s.slice(1);
  if (s.startsWith('d=')) s = s.slice(2);
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json);
    if (payload.v !== PAYLOAD_VERSION) return null;
    if (!payload.s) return null; // a sketch payload must carry a session id
    return {
      titleAr: payload.ar,
      titleEn: payload.en,
      lang: payload.l === 'en' ? 'en' : 'ar', // default anything else to 'ar'
      sessionId: payload.s,
      catAr: payload.ca,
      catEn: payload.ce,
      // 'dark' | 'light' | undefined — the phone defaults a missing/unknown
      // value to 'light' (the classic white-paper drawing surface).
      theme: payload.t === 'dark' ? 'dark' : payload.t === 'light' ? 'light' : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience: build the full sketch URL for a host page rendering a QR.
 * `origin` should be `window.location.origin` from the host context.
 */
export function buildSketchUrl({ origin, titleAr, titleEn, lang, sessionId, catAr, catEn, theme }) {
  const token = encodeSketch({ titleAr, titleEn, lang, sessionId, catAr, catEn, theme });
  return `${origin}/draw.html#d=${token}`;
}
