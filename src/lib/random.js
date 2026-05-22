// Single source of truth for random-pick utilities. Replaces three hand-rolled
// Fisher–Yates copies and a biased Array.sort()-based shuffle that previously
// lived in data/categories.js, lib/queries.js, lib/gameReducer.js, and
// screens/SetupScreen/index.jsx.

/**
 * Unbiased Fisher–Yates shuffle. Returns a new array; never mutates input.
 * Note: Array.prototype.sort with a Math.random()-based comparator is NOT
 * uniformly random — different engines give different distributions — so
 * always use this helper instead of `arr.sort(() => Math.random() - 0.5)`.
 */
export function shuffle(arr) {
  if (!arr) return [];
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Random sample of up to n items, no replacement. Returns the input as-is
 * (copied) when there are fewer than n items, so callers don't need to guard.
 */
export function pickN(arr, n) {
  if (!arr || arr.length <= n) return arr ? [...arr] : [];
  return shuffle(arr).slice(0, n);
}

// ─── Seeded (deterministic) variants ─────────────────────────────────────
// A fixed seed always yields the same shuffle/pick. Used so a game's random
// question + challenge selection is decided once and never shifts when a
// component remounts and a picker re-runs — see usePrefetchQuestions. That
// re-randomisation was the cause of duplicate questions across cells.

// mulberry32 — a tiny, fast 32-bit PRNG. The same seed ⇒ the same sequence.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a string hash → 32-bit int. Turns a descriptive key ("seed|slug|200")
// into a numeric seed for mulberry32.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build a stable 32-bit seed from any number of parts (numbers/strings).
 * The same parts always produce the same seed.
 */
export function seedFrom(...parts) {
  return hashString(parts.join('|'));
}

/**
 * Deterministic Fisher–Yates shuffle. The same (array order, seed) pair
 * always returns the same result. Returns a new array; never mutates input.
 */
export function seededShuffle(arr, seed) {
  if (!arr) return [];
  const out = [...arr];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deterministic random sample of up to n items, no replacement. Like pickN,
 * but stable for a given seed — re-running it yields the identical sample.
 */
export function seededPickN(arr, n, seed) {
  if (!arr || arr.length <= n) return arr ? [...arr] : [];
  return seededShuffle(arr, seed).slice(0, n);
}
