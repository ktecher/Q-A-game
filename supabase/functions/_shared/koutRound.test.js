import { describe, it, expect } from 'vitest';
import {
  dealHands, makeRng, legalPlays, trickWinner, leadSuitFor,
  nextSeat, teamOf, scoreRound, checkGameOver, HAND_SIZE,
  MAX_BID, TARGET_SCORE, SHUTOUT_SCORE, BAWN_SCORE,
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

/* A generous cap — real games end in a handful of rounds. If a game ever ran
   this long, checkGameOver would be the bug, not slow luck. */
const MAX_ROUNDS = 500;

describe('a full multi-round game', () => {
  it.each([4, 6])('always terminates with scores that only rise and exactly one winner (%i seats)', (seatCount) => {
    for (let seed = 1; seed <= 15; seed++) {
      let score = [0, 0];
      let winner = null;
      let roundNo = 1;
      for (; roundNo <= MAX_ROUNDS; roundNo++) {
        // Real deal + real trick play each round; the deal seed changes every
        // round so it is not the same nine tricks replayed forever.
        const { tricksWon } = playRound(seatCount, seed * 1000 + roundNo);
        const bidderSeat = roundNo % 2; // alternate which team gets to bid
        const bid = 5;
        const delta = scoreRound({ bid, bidderSeat, mulzum: false, tricksWon });
        const prev = score;
        score = [score[0] + delta[0], score[1] + delta[1]];
        expect(score[0]).toBeGreaterThanOrEqual(prev[0]); // scores only increase
        expect(score[1]).toBeGreaterThanOrEqual(prev[1]);
        winner = checkGameOver(score, { roundNo, bid, tricksWon, bidderSeat });
        if (winner !== null) break;
      }
      expect(roundNo).toBeLessThanOrEqual(MAX_ROUNDS); // it actually terminated
      expect([0, 1]).toContain(winner); // exactly one team won, never both or neither
    }
  });

  it('a game ending at the 101 target really has the winner at or above it', () => {
    // Both teams bid and make it in turn, so neither is ever shut out at zero
    // — this can only end via the target-score path.
    let score = [0, 0];
    let winner = null;
    let roundNo = 1;
    for (; roundNo <= MAX_ROUNDS; roundNo++) {
      const bidderSeat = roundNo % 2;
      const tricksWon = bidderSeat === 0 ? [7, 2] : [2, 7];
      const delta = scoreRound({ bid: 5, bidderSeat, mulzum: false, tricksWon });
      score = [score[0] + delta[0], score[1] + delta[1]];
      winner = checkGameOver(score, { roundNo, bid: 5, tricksWon, bidderSeat });
      if (winner !== null) break;
    }
    expect(roundNo).toBeLessThanOrEqual(MAX_ROUNDS);
    expect(winner).not.toBe(null);
    expect(score[winner]).toBeGreaterThanOrEqual(TARGET_SCORE);
    expect(score[winner === 0 ? 1 : 0]).toBeGreaterThan(0); // proves it wasn't a shutout
  });

  it('the 51-with-opponents-on-zero shutout path is reachable and fires correctly', () => {
    // Team 0 bids and always makes it; team 1 never gets a point.
    let score = [0, 0];
    let winner = null;
    let roundNo = 1;
    for (; roundNo <= MAX_ROUNDS; roundNo++) {
      const tricksWon = [6, 3]; // bid of 5, made every time
      const delta = scoreRound({ bid: 5, bidderSeat: 0, mulzum: false, tricksWon });
      expect(delta[1]).toBe(0);
      score = [score[0] + delta[0], score[1] + delta[1]];
      winner = checkGameOver(score, { roundNo, bid: 5, tricksWon, bidderSeat: 0 });
      if (winner !== null) break;
    }
    expect(winner).toBe(0);
    expect(score[1]).toBe(0);
    expect(score[0]).toBeGreaterThanOrEqual(SHUTOUT_SCORE);
    expect(score[0]).toBeLessThan(TARGET_SCORE); // ended via the shutout, not the 101 target
  });

  it('a successful بوان scores exactly 36 and ends the game in round one — not as 9 tricks taken', () => {
    const tricksWon = [9, 0];
    const delta = scoreRound({ bid: MAX_BID, bidderSeat: 0, mulzum: false, tricksWon });
    expect(delta).toEqual([BAWN_SCORE, 0]);
    expect(delta[0]).not.toBe(tricksWon[0]); // not scored as "9 tricks taken"
    expect(checkGameOver(delta, { roundNo: 1, bid: MAX_BID, tricksWon, bidderSeat: 0 })).toBe(0);
  });
});
