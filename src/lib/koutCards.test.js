import { describe, it, expect } from 'vitest';
import { cardFace, suitLabelAr } from './koutCards.js';

describe('cardFace', () => {
  it('renders ten as 10, not T', () => {
    expect(cardFace('TH')).toMatchObject({ rank: '10', glyph: '♥', red: true });
  });
  it('marks black suits', () => {
    expect(cardFace('AS')).toMatchObject({ rank: 'A', glyph: '♠', red: false });
  });
  it('handles both jokers', () => {
    expect(cardFace('JR')).toMatchObject({ joker: true, red: true });
    expect(cardFace('JB')).toMatchObject({ joker: true, red: false });
  });

  // Guards the fix, not the field: `red` is a colour, and colour is exactly
  // the channel that fails on a chroma-subsampled TV feed. If the two jokers
  // ever again differ ONLY by `red`, this fails.
  it('separates the two jokers by something other than colour', () => {
    const jr = cardFace('JR');
    const jb = cardFace('JB');
    expect(jr.jokerAr).toBeTruthy();
    expect(jb.jokerAr).toBeTruthy();
    expect(jr.jokerAr).not.toBe(jb.jokerAr);
  });
});

describe('suitLabelAr', () => {
  it('names the suits in Arabic', () => {
    expect(suitLabelAr('S')).toBe('بستوني');
    expect(suitLabelAr('H')).toBe('كوبة');
    expect(suitLabelAr('D')).toBe('ديناري');
    expect(suitLabelAr('C')).toBe('سباتي');
  });
});
