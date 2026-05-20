// Persistent setup preferences — choices the player makes in SetupScreen that
// should be remembered between games (as opposed to in-game state, which lives
// in gameReducer/gameStorage). Mirrors the read/write pattern in theme.js.
//
// Stored as a single JSON object under STORAGE_KEYS.SETTINGS so new preferences
// can be added without minting a new key each time.

import { STORAGE_KEYS } from './storageKeys';

const STORAGE_KEY = STORAGE_KEYS.SETTINGS;

// Defaults applied for a first-time player or when stored data is missing/invalid.
const DEFAULTS = {
  challengesEnabled: true, // Challenge rounds on by default — opt-out, not opt-in.
};

export function readSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Spread over DEFAULTS so a partial/older payload still yields every field.
      return { ...DEFAULTS, ...parsed };
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
