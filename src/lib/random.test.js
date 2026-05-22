import { describe, it, expect } from 'vitest';
import { shuffle, pickN, seedFrom, seededShuffle, seededPickN } from './random';

describe('random — unseeded helpers', () => {
  it('shuffle returns a permutation and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const out = shuffle(input);
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual(copy); // input untouched
  });

  it('pickN returns n distinct items from the pool', () => {
    const out = pickN([1, 2, 3, 4, 5, 6], 2);
    expect(out).toHaveLength(2);
    expect(new Set(out).size).toBe(2);
    expect(out.every((x) => [1, 2, 3, 4, 5, 6].includes(x))).toBe(true);
  });
});

describe('random — seeded helpers (the duplicate-question fix)', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('seedFrom is stable for the same parts and varies by part', () => {
    expect(seedFrom(123, 'animals', 200)).toBe(seedFrom(123, 'animals', 200));
    expect(seedFrom(123, 'animals', 200)).not.toBe(seedFrom(123, 'animals', 400));
  });

  it('seededShuffle is deterministic for a given seed', () => {
    const seed = seedFrom(42, 'animals', 200);
    expect(seededShuffle(pool, seed)).toEqual(seededShuffle(pool, seed));
  });

  it('seededShuffle returns a permutation and does not mutate input', () => {
    const copy = [...pool];
    const out = seededShuffle(pool, 999);
    expect([...out].sort()).toEqual([...pool].sort());
    expect(pool).toEqual(copy);
  });

  it('different seeds generally produce different orders', () => {
    const orders = [1, 2, 3].map((s) => seededShuffle(pool, s).join(''));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('seededPickN returns n distinct items, stable for a seed', () => {
    const seed = seedFrom(7, 'cars', 600);
    const first = seededPickN(pool, 2, seed);
    const again = seededPickN(pool, 2, seed);
    expect(first).toHaveLength(2);
    expect(new Set(first).size).toBe(2); // distinct
    expect(again).toEqual(first); // stable across calls
  });

  it('re-running a tier pick with the same game seed never re-rolls', () => {
    // Simulates usePrefetchQuestions running again on every BoardScreen
    // remount — the bug was that it re-randomised and could re-pick a
    // question already shown in another cell.
    const gameSeed = 0xc0ffee;
    const tierSeed = seedFrom(gameSeed, 'animals', 200);
    const run1 = seededPickN(pool, 2, tierSeed);
    const run2 = seededPickN(pool, 2, tierSeed); // remount
    const run3 = seededPickN(pool, 2, tierSeed); // another remount
    expect(run2).toEqual(run1);
    expect(run3).toEqual(run1);
    expect(run1[0]).not.toBe(run1[1]); // the tier's two cells stay distinct
  });

  it('a new game (new seed) is free to pick a different pair', () => {
    const base = seededPickN(pool, 2, seedFrom(1, 'animals', 200)).join('');
    const others = [2, 3, 4, 5, 6].map((s) =>
      seededPickN(pool, 2, seedFrom(s, 'animals', 200)).join('')
    );
    expect(others.some((o) => o !== base)).toBe(true);
  });
});
