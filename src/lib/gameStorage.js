// Bump when the persisted state shape changes in a non-backwards-compatible
// way — old localStorage entries are then ignored on load.
import { STORAGE_KEYS } from './storageKeys';
export const STORAGE_KEY = STORAGE_KEYS.GAME;
const STORAGE_VERSION = 1;

export function serializeState(state) {
  return {
    version: STORAGE_VERSION,
    state: {
      ...state,
      picked: Array.from(state.picked),
      challengeCells: Array.from(state.challengeCells),
    },
  };
}

function deserializeState(payload) {
  if (!payload || payload.version !== STORAGE_VERSION) return null;
  const s = payload.state;
  if (!s || typeof s !== 'object') return null;
  return {
    ...s,
    picked: new Set(s.picked ?? []),
    challengeCells: new Set(s.challengeCells ?? []),
  };
}

export function loadStoredState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return deserializeState(JSON.parse(raw));
  } catch {
    return null;
  }
}
