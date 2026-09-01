import { describe, it, expect } from 'vitest';
import { buildDeck, suitOf, rankOf, isJoker, RED_JOKER, BLACK_JOKER, makeRng, shuffle, dealHands, trickWinner, cardPower, legalPlays, leadSuitFor, resolveBidding, scoreRound, checkGameOver, teamOf, nextSeat, PASS } from './koutRules.js';

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

const base = { seatCount: 4 };

describe('legalPlays — leading', () => {
  it('lets the leader play anything at all', () => {
    const hand = ['7H', 'AS', RED_JOKER, BLACK_JOKER];
    expect(legalPlays(hand, { ...base, trick: [] }).sort()).toEqual([...hand].sort());
  });

  it('never restricts a joker lead', () => {
    const out = legalPlays(['9C', RED_JOKER, BLACK_JOKER], { ...base, trick: [] });
    expect(out).toContain(RED_JOKER);
    expect(out).toContain(BLACK_JOKER);
  });
});

describe('legalPlays — following', () => {
  it('must follow the lead suit when able', () => {
    const hand = ['7H', 'KH', 'AS', '9C'];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out.sort()).toEqual(['7H', 'KH']);
  });

  it('may play anything when void in the lead suit', () => {
    const hand = ['AS', '9C', RED_JOKER];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out.sort()).toEqual([...hand].sort());
  });

  it('does not count a joker as following suit', () => {
    const hand = ['7H', RED_JOKER];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out).toEqual(['7H']); // holding a heart, the heart is forced
  });

  it('frees everyone when a joker led — no suit was set', () => {
    const hand = ['7H', 'AS', '9C'];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: RED_JOKER }] });
    expect(out.sort()).toEqual([...hand].sort());
  });

  it('still frees everyone when the black joker led', () => {
    const out = legalPlays(['7H', 'AS'], { ...base, trick: [{ seat: 0, card: BLACK_JOKER }] });
    expect(out).toHaveLength(2);
  });

  it('always leaves at least one legal card', () => {
    const out = legalPlays([RED_JOKER, BLACK_JOKER], { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out).toHaveLength(2);
  });
});

describe('leadSuitFor', () => {
  it('is the suit of the first card', () => {
    expect(leadSuitFor([{ seat: 0, card: 'TH' }])).toBe('H');
  });
  it('is null when a joker led — a joker has no suit', () => {
    expect(leadSuitFor([{ seat: 0, card: RED_JOKER }])).toBe(null);
    expect(leadSuitFor([{ seat: 0, card: BLACK_JOKER }])).toBe(null);
  });
  it('is null before anyone has played', () => {
    expect(leadSuitFor([])).toBe(null);
  });
});

describe('seating', () => {
  it('alternates teams around the table', () => {
    expect([0, 1, 2, 3, 4, 5].map(teamOf)).toEqual([0, 1, 0, 1, 0, 1]);
  });
  it('turns counterclockwise and wraps', () => {
    expect(nextSeat(3, 4)).toBe(0);
    expect(nextSeat(4, 6)).toBe(5);
  });
});

describe('resolveBidding', () => {
  it('the highest bid wins', () => {
    expect(resolveBidding([5, PASS, 7, PASS], { seatCount: 4, lastSeat: 3 }))
      .toEqual({ winnerSeat: 2, bid: 7, mulzum: false });
  });

  it('forces the last seat to five when everyone passes — مُلزم', () => {
    expect(resolveBidding([PASS, PASS, PASS, PASS], { seatCount: 4, lastSeat: 3 }))
      .toEqual({ winnerSeat: 3, bid: 5, mulzum: true });
  });

  it('keeps the first of two equal bids — you cannot match, only raise', () => {
    expect(resolveBidding([7, PASS, 7, PASS], { seatCount: 4, lastSeat: 3 }).winnerSeat).toBe(0);
  });
});

describe('scoreRound', () => {
  it('a made bid scores the tricks actually taken', () => {
    // Bid 5, took 6 → team 0 gets 6, not 5.
    expect(scoreRound({ bid: 5, bidderSeat: 0, mulzum: false, tricksWon: [6, 3] }))
      .toEqual([6, 0]);
  });

  it('a failed bid gives the opponents double the bid', () => {
    expect(scoreRound({ bid: 7, bidderSeat: 0, mulzum: false, tricksWon: [6, 3] }))
      .toEqual([0, 14]);
  });

  it('a failed مُلزم gives the minimum five', () => {
    expect(scoreRound({ bid: 5, bidderSeat: 1, mulzum: true, tricksWon: [5, 4] }))
      .toEqual([5, 0]);
  });

  it('a made بوان is worth thirty-six', () => {
    expect(scoreRound({ bid: 9, bidderSeat: 1, mulzum: false, tricksWon: [0, 9] }))
      .toEqual([0, 36]);
  });

  it('scores the bidding team from the correct seat', () => {
    expect(scoreRound({ bid: 5, bidderSeat: 1, mulzum: false, tricksWon: [3, 6] }))
      .toEqual([0, 6]);
  });
});

describe('checkGameOver', () => {
  const noWin = { roundNo: 3, bid: 5, tricksWon: [5, 4], bidderSeat: 0 };
  it('ends at 101', () => {
    expect(checkGameOver([104, 60], noWin)).toBe(0);
    expect(checkGameOver([99, 60], noWin)).toBe(null);
  });
  it('ends at 51 when the opponents are still on zero', () => {
    expect(checkGameOver([55, 0], noWin)).toBe(0);
    expect(checkGameOver([55, 3], noWin)).toBe(null);
  });
  it('ends on a first-round بوان that takes all nine', () => {
    expect(checkGameOver([36, 0], { roundNo: 1, bid: 9, tricksWon: [9, 0], bidderSeat: 0 })).toBe(0);
  });
  it('does not end on a بوان in a later round', () => {
    expect(checkGameOver([36, 40], { roundNo: 2, bid: 9, tricksWon: [9, 0], bidderSeat: 0 })).toBe(null);
  });
});
