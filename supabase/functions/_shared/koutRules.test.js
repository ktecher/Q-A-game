import { describe, it, expect } from 'vitest';
import { buildDeck, suitOf, rankOf, isJoker, RED_JOKER, BLACK_JOKER } from './koutRules.js';

describe('buildDeck', () => {
  it('bo-6 is the full 52 plus both jokers', () => {
    const deck = buildDeck(6);
    expect(deck).toHaveLength(54);
    expect(new Set(deck).size).toBe(54);
    expect(deck).toContain('2S');
    expect(deck).toContain(RED_JOKER);
    expect(deck).toContain(BLACK_JOKER);
  });

  it('bo-4 strips 2-5 and the two red sixes, leaving 36', () => {
    const deck = buildDeck(4);
    expect(deck).toHaveLength(36);
    expect(new Set(deck).size).toBe(36);
    for (const c of ['2S', '3H', '4D', '5C', '6H', '6D']) expect(deck).not.toContain(c);
    for (const c of ['6S', '6C', '7H', 'AS']) expect(deck).toContain(c);
  });

  it('always deals out exactly, nine each, no stock', () => {
    expect(buildDeck(4).length).toBe(4 * 9);
    expect(buildDeck(6).length).toBe(6 * 9);
  });

  it('rejects any other seat count', () => {
    expect(() => buildDeck(5)).toThrow(/seatCount/);
  });
});

describe('card helpers', () => {
  it('reads suit and rank', () => {
    expect(suitOf('TH')).toBe('H');
    expect(rankOf('TH')).toBe('T');
    expect(suitOf(RED_JOKER)).toBe(null);
    expect(isJoker(BLACK_JOKER)).toBe(true);
    expect(isJoker('AS')).toBe(false);
  });
});
