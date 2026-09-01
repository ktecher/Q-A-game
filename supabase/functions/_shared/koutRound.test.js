import { describe, it, expect } from 'vitest';
import {
  dealHands, makeRng, legalPlays, trickWinner, leadSuitFor,
  nextSeat, teamOf, scoreRound, HAND_SIZE,
} from './koutRules.js';

/* Plays a whole round with every player choosing their first legal card.
   Asserts the invariants that must hold no matter what: nine tricks, every
   card played exactly once, tricks split between the two teams. */
function playRound(seatCount, seed) {
  const hands = dealHands(seatCount, makeRng(seed));
  const dealt = hands.flat();
  const hukm = 'S';
  const bid = 5;
  const bidderSeat = 0;
  const playedCards = [];
  const tricksWon = [0, 0];
  let leader = bidderSeat;

  for (let t = 0; t < HAND_SIZE; t++) {
    const trick = [];
    let seat = leader;
    for (let i = 0; i < seatCount; i++) {
      const options = legalPlays(hands[seat], { trick, seatCount });
      expect(options.length).toBeGreaterThan(0);
      const card = options[0];
      hands[seat] = hands[seat].filter((c) => c !== card);
      trick.push({ seat, card });
      playedCards.push(card);
      seat = nextSeat(seat, seatCount);
    }
    const leadSuit = leadSuitFor(trick);
    leader = trickWinner(trick, { hukm, leadSuit, seatCount });
    tricksWon[teamOf(leader)] += 1;
  }
  return { dealt, playedCards, tricksWon, hands };
}

describe('a complete round', () => {
  it.each([4, 6])('plays out with %i seats without losing a card', (seatCount) => {
    for (let seed = 1; seed <= 25; seed++) {
      const { dealt, playedCards, tricksWon, hands } = playRound(seatCount, seed);
      expect(playedCards).toHaveLength(seatCount * HAND_SIZE);
      expect(new Set(playedCards).size).toBe(playedCards.length);
      expect([...playedCards].sort()).toEqual([...dealt].sort());
      for (const h of hands) expect(h).toHaveLength(0);
      expect(tricksWon[0] + tricksWon[1]).toBe(HAND_SIZE);
    }
  });

  it('always produces a score for exactly one team', () => {
    const { tricksWon } = playRound(4, 11);
    const points = scoreRound({ bid: 5, bidderSeat: 0, mulzum: false, tricksWon });
    expect(points.filter((p) => p > 0)).toHaveLength(1);
  });
});
