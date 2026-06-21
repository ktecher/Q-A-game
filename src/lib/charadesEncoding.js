// URL-fragment encoding for Wala Kalma (charades) titles.
// The host's BoardScreen modal generates a QR whose URL fragment carries the
// title payload; the phone page (`public/c.html`) decodes it and renders.
//
// Fragment (after `#`) is never sent to the server, so titles never appear in
// access logs and no DB roundtrip is needed from the phone.
//
// IMPORTANT: the decode logic is duplicated verbatim in `public/c.html` (which
// must stay standalone — it cannot import from the SPA bundle). Keep both in
// sync if you change the wire format.

const PAYLOAD_VERSION = 1;

/**
 * Encode a title payload as a base64url string.
 * The caller usually then prepends `d=` to get the QR URL's fragment value.
 *
 * @param {object} input
 * @param {string} input.titleAr — Arabic title (always required, even for English category — used as secondary text)
 * @param {string} input.titleEn — English title (always required)
 * @param {'ar' | 'en'} input.lang — Which language is the primary display
 */
export function encodeCharade({ titleAr, titleEn, lang }) {
  const payload = { v: PAYLOAD_VERSION, ar: titleAr, en: titleEn, l: lang };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convenience: build the full charade URL for a host page rendering a QR.
 * `origin` should be `window.location.origin` from the host context.
 */
export function buildCharadeUrl({ origin, titleAr, titleEn, lang }) {
  const token = encodeCharade({ titleAr, titleEn, lang });
  return `${origin}/c.html#d=${token}`;
}
