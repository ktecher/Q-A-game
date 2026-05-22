import { describe, it, expect } from 'vitest';
import {
  encodeSketch,
  decodeSketch,
  buildSketchUrl,
  makeSessionId,
} from './sketchEncoding';

// Hand-craft a base64url token the same way encodeSketch does, but from an
// arbitrary payload object — lets us test rejection of bad payloads.
function rawToken(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('sketchEncoding', () => {
  const sample = {
    titleAr: 'قطة',
    titleEn: 'Cat',
    lang: 'ar',
    sessionId: 'a1b2c3d4',
    catAr: 'حيوانات',
    catEn: 'Animals',
  };

  it('round-trips a full payload (with category) through encode → decode', () => {
    expect(decodeSketch(encodeSketch(sample))).toEqual(sample);
  });

  it('accepts a raw token, a d= fragment, and a #d= fragment', () => {
    const token = encodeSketch(sample);
    expect(decodeSketch(token)).toEqual(sample);
    expect(decodeSketch(`d=${token}`)).toEqual(sample);
    expect(decodeSketch(`#d=${token}`)).toEqual(sample);
  });

  it('preserves Arabic and English text exactly', () => {
    const decoded = decodeSketch(encodeSketch(sample));
    expect(decoded.titleAr).toBe('قطة');
    expect(decoded.titleEn).toBe('Cat');
    expect(decoded.catAr).toBe('حيوانات');
  });

  it('omits the category cleanly when none is given', () => {
    const noCat = { titleAr: 'بيت', titleEn: 'House', lang: 'en', sessionId: 'ff00ff00' };
    const decoded = decodeSketch(encodeSketch(noCat));
    expect(decoded.titleEn).toBe('House');
    expect(decoded.catAr).toBeUndefined();
    expect(decoded.catEn).toBeUndefined();
  });

  it('returns null for empty, null, or non-base64 input', () => {
    expect(decodeSketch('')).toBeNull();
    expect(decodeSketch(null)).toBeNull();
    expect(decodeSketch('not-valid-base64!!!')).toBeNull();
  });

  it('returns null when the payload version does not match', () => {
    expect(decodeSketch(rawToken({ v: 999, ar: 'x', en: 'y', l: 'ar', s: 'sid' }))).toBeNull();
  });

  it('returns null when the session id is missing', () => {
    expect(decodeSketch(rawToken({ v: 1, ar: 'x', en: 'y', l: 'ar' }))).toBeNull();
  });

  it('returns null when the session id is an empty string', () => {
    expect(decodeSketch(rawToken({ v: 1, ar: 'x', en: 'y', l: 'ar', s: '' }))).toBeNull();
  });

  it('returns null for non-object JSON payloads', () => {
    expect(decodeSketch(rawToken(42))).toBeNull();
    expect(decodeSketch(rawToken('hello'))).toBeNull();
    expect(decodeSketch(rawToken([]))).toBeNull();
    expect(decodeSketch(rawToken(null))).toBeNull();
  });

  it('makeSessionId returns 8 hex characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(makeSessionId()).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('buildSketchUrl produces a /draw.html#d= URL that decodes back', () => {
    const url = buildSketchUrl({ origin: 'https://example.com', ...sample });
    expect(url.startsWith('https://example.com/draw.html#d=')).toBe(true);
    expect(decodeSketch(url.slice(url.indexOf('#')))).toEqual(sample);
  });
});
