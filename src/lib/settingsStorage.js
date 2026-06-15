// Persistent setup preferences — choices the player makes in SetupScreen that
// should be remembered between games (as opposed to in-game state, which lives
// in gameReducer/gameStorage). Mirrors the read/write pattern in theme.js.
//
// Stored as a single JSON object under STORAGE_KEYS.SETTINGS so new preferences
// can be added without minting a new key each time.

import { STORAGE_KEYS } from './storageKeys';

const STORAGE_KEY = STORAGE_KEYS.SETTINGS;

// The two count choices we expose in Setup. Kept here (not in gameReducer) so
// the storage layer can sanitize a corrupt stored value before any consumer
// sees it. Imported by SetupScreen for the segmented control bounds.
export const ALLOWED_CHALLENGE_COUNTS = [2, 4];

// Defaults applied for a first-time player or when stored data is missing/invalid.
const DEFAULTS = {
  challengesEnabled: true, // Challenge rounds on by default — opt-out, not opt-in.
  challengeCount: 2,       // 2 hidden challenge cells per game — matches the
                           // long-standing hardcoded default. Must be one of
                           // ALLOWED_CHALLENGE_COUNTS.
};

// Coerce an arbitrary stored value into a valid challengeCount. Returns the
// default (2) for anything outside the allowed set — defends against
// hand-edited localStorage, older payloads predating this field, and future
// schema drift.
function sanitizeChallengeCount(value) {
  return ALLOWED_CHALLENGE_COUNTS.includes(value) ? value : DEFAULTS.challengeCount;
}

export function readSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Spread over DEFAULTS so a partial/older payload still yields every field.
      const merged = { ...DEFAULTS, ...parsed };
      merged.challengeCount = sanitizeChallengeCount(merged.challengeCount);
      return merged;
    }
  } catch {
    // ignore (private mode, malformed JSON, etc.)
  }
  return { ...DEFAULTS };
}

export function writeSettings(patch) {
  try {
    const next = { ...readSettings(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
