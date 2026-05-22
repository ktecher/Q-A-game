import { describe, it, expect } from 'vitest';
import { DRAWING_WORDS, pickDrawingWord } from './drawingWords';

describe('drawingWords', () => {
  it('every entry has bilingual word + bilingual category text', () => {
    expect(DRAWING_WORDS.length).toBeGreaterThan(20);
    for (const w of DRAWING_WORDS) {
      expect(w.ar.length).toBeGreaterThan(0);
      expect(w.en.length).toBeGreaterThan(0);
      expect(w.catAr.length).toBeGreaterThan(0);
      expect(w.catEn.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate English words (so the exclude-set works)', () => {
    const seen = new Set(DRAWING_WORDS.map((w) => w.en));
    expect(seen.size).toBe(DRAWING_WORDS.length);
  });

  it('pickDrawingWord returns a word from the given pool', () => {
    expect(DRAWING_WORDS).toContainEqual(pickDrawingWord(DRAWING_WORDS));
  });

  it('pickDrawingWord skips excluded English words', () => {
    const last = DRAWING_WORDS[DRAWING_WORDS.length - 1];
    const exclude = DRAWING_WORDS.slice(0, -1).map((w) => w.en);
    expect(pickDrawingWord(DRAWING_WORDS, exclude).en).toBe(last.en);
  });

  it('pickDrawingWord falls back to the full pool when all are excluded', () => {
    const all = DRAWING_WORDS.map((w) => w.en);
    expect(DRAWING_WORDS).toContainEqual(pickDrawingWord(DRAWING_WORDS, all));
  });

  it('pickDrawingWord falls back to local words for an empty or missing pool', () => {
    expect(DRAWING_WORDS).toContainEqual(pickDrawingWord([]));
    expect(DRAWING_WORDS).toContainEqual(pickDrawingWord(undefined));
  });
});
