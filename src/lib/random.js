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
