import { describe, it, expect } from 'vitest';
import { buildDeck, suitOf, rankOf, isJoker, RED_JOKER, BLACK_JOKER, makeRng, shuffle, dealHands, trickWinner, cardPower } from './koutRules.js';

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

describe('shuffle', () => {
  it('is a permutation, not a mutation', () => {
    const deck = buildDeck(4);
    const out = shuffle(deck, makeRng(1));
    expect(out).toHaveLength(deck.length);
    expect([...out].sort()).toEqual([...deck].sort());
    expect(deck[0]).toBe(buildDeck(4)[0]); // input untouched
  });

  it('is deterministic for a given seed', () => {
    expect(shuffle(buildDeck(6), makeRng(42))).toEqual(shuffle(buildDeck(6), makeRng(42)));
  });

  it('actually moves cards', () => {
    const deck = buildDeck(6);
    expect(shuffle(deck, makeRng(7))).not.toEqual(deck);
  });
});

describe('dealHands', () => {
  it.each([4, 6])('gives %i players nine distinct cards each, using the whole deck', (n) => {
    const hands = dealHands(n, makeRng(3));
    expect(hands).toHaveLength(n);
    for (const h of hands) expect(h).toHaveLength(9);
    const all = hands.flat();
    expect(all).toHaveLength(n * 9);
    expect(new Set(all).size).toBe(n * 9); // THE no-duplicate guarantee
    expect([...all].sort()).toEqual([...buildDeck(n)].sort());
  });

  it('clamps an out-of-range rng instead of dealing out of bounds', () => {
    // An rng that returns >= 1 would push an out-of-range index.
    expect(() => dealHands(4, () => 1)).not.toThrow(); // clamped, still valid
    const hands = dealHands(4, () => 1);
    expect(new Set(hands.flat()).size).toBe(36);
  });
});

const ctx = { hukm: 'S', leadSuit: 'H', seatCount: 4 };

describe('trickWinner', () => {
  it('highest card of the lead suit wins a plain trick', () => {
    const trick = [
      { seat: 0, card: '9H' }, { seat: 1, card: 'KH' },
      { seat: 2, card: '7H' }, { seat: 3, card: 'TH' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });

  it('an off-suit discard cannot win', () => {
    const trick = [
      { seat: 0, card: '7H' }, { seat: 1, card: 'AD' },
      { seat: 2, card: 'AC' }, { seat: 3, card: '8H' },
    ];
    expect(trickWinner(trick, ctx)).toBe(3);
  });

  it('any hukm beats any lead-suit card', () => {
    const trick = [
      { seat: 0, card: 'AH' }, { seat: 1, card: '7S' },
      { seat: 2, card: 'KH' }, { seat: 3, card: 'QH' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });

  it('ranks hukm among itself', () => {
    const trick = [
      { seat: 0, card: '7H' }, { seat: 1, card: '7S' },
      { seat: 2, card: 'KS' }, { seat: 3, card: 'TS' },
    ];
    expect(trickWinner(trick, ctx)).toBe(2);
  });

  it('orders red joker > ace of hukm > black joker > other hukm', () => {
    const p = (c) => cardPower(c, ctx);
    expect(p(RED_JOKER)).toBeGreaterThan(p('AS'));
    expect(p('AS')).toBeGreaterThan(p(BLACK_JOKER));
    expect(p(BLACK_JOKER)).toBeGreaterThan(p('KS'));
    expect(p('KS')).toBeGreaterThan(p('AH'));
  });

  it('red joker takes a trick containing the ace of hukm', () => {
    const trick = [
      { seat: 0, card: 'AS' }, { seat: 1, card: RED_JOKER },
      { seat: 2, card: BLACK_JOKER }, { seat: 3, card: 'KS' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });

  it('resolves a joker-led trick, where no suit was set', () => {
    const nullLead = { hukm: 'S', leadSuit: null, seatCount: 4 };
    const trick = [
      { seat: 0, card: BLACK_JOKER }, { seat: 1, card: '9H' },
      { seat: 2, card: 'AS' },        { seat: 3, card: 'KC' },
    ];
    // Ace of hukm (3000) outranks the black joker (2000); the two off-suit
    // cards cannot win at all, because with no lead suit they score zero.
    expect(trickWinner(trick, nullLead)).toBe(2);
    expect(cardPower('9H', nullLead)).toBe(0);
    expect(cardPower('KC', nullLead)).toBe(0);
  });
});
