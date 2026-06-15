import { describe, it, expect } from 'vitest';
import {
  reducer,
  createInitialState,
  ALLOWED_CHALLENGE_COUNTS,
  DEFAULT_CHALLENGE_CELLS,
} from './gameReducer';

// Minimal category fixtures — pickChallengeCells only reads .slug.
const fixtureCategories = [
  { slug: 'a' }, { slug: 'b' }, { slug: 'c' },
  { slug: 'd' }, { slug: 'e' }, { slug: 'f' },
];

function startWith(payload) {
  const initial = createInitialState();
  return reducer(initial, {
    type: 'START_GAME',
    payload: {
      categories: fixtureCategories,
      teams: [{ name: 'T1' }, { name: 'T2' }],
      difficulty: 'mixed',
      timerSeconds: 30,
      ...payload,
    },
  });
}

describe('gameReducer — START_GAME challengeCount', () => {
  it('exposes the allowed counts and the default', () => {
    expect(ALLOWED_CHALLENGE_COUNTS).toEqual([2, 4]);
    expect(DEFAULT_CHALLENGE_CELLS).toBe(2);
  });

  it('seeds exactly 2 challenge cells when challengeCount=2', () => {
    const next = startWith({ challengesEnabled: true, challengeCount: 2 });
    expect(next.challengeCells.size).toBe(2);
  });

  it('seeds exactly 4 challenge cells when challengeCount=4', () => {
    const next = startWith({ challengesEnabled: true, challengeCount: 4 });
    expect(next.challengeCells.size).toBe(4);
  });

  it('defaults to 2 cells when challengeCount is omitted (legacy payload)', () => {
    const next = startWith({ challengesEnabled: true });
    expect(next.challengeCells.size).toBe(DEFAULT_CHALLENGE_CELLS);
  });

  it('clamps an out-of-range count back to the default', () => {
    for (const bad of [0, 1, 3, 5, 99, -1, NaN, undefined, null, 'four']) {
      const next = startWith({ challengesEnabled: true, challengeCount: bad });
      expect(next.challengeCells.size).toBe(DEFAULT_CHALLENGE_CELLS);
    }
  });

  it('produces zero challenge cells when challengesEnabled=false, regardless of count', () => {
    for (const n of [2, 4, 99]) {
      const next = startWith({ challengesEnabled: false, challengeCount: n });
      expect(next.challengeCells.size).toBe(0);
    }
  });
});
