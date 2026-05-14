import { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { STORAGE_KEY, serializeState, loadStoredState } from '../lib/gameStorage';
import { reducer, createInitialState, ROW_VALUES } from '../lib/gameReducer';

const GameContext = createContext(null);

function initState() {
  const stored = loadStoredState();
  // Only restore if a real game was in progress — an unstarted stored state
  // is no different from a fresh init, and skipping the restore avoids
  // surprising users with stale demo state.
  if (stored && stored.started && !stored.gameOver) return stored;
  return createInitialState();
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // Persist on every change. Reset/unstarted/finished games clear the slot
  // so a new tab doesn't accidentally resume them.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.started && !state.gameOver) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Quota exceeded or storage disabled — in-memory state still works.
    }
  }, [state]);

  const value = useMemo(() => {
    const totalCells = 6 * ROW_VALUES.length;
    const winner =
      state.gameOver && state.teams[0].score !== state.teams[1].score
        ? state.teams[0].score > state.teams[1].score
          ? state.teams[0]
          : state.teams[1]
        : null;
    const isTie = state.gameOver && state.teams[0].score === state.teams[1].score;
    return {
      state,
      dispatch,
      totalCells,
      rowValues: ROW_VALUES,
      winner,
      isTie,
      // Convenience action creators
      startGame: (payload) => dispatch({ type: 'START_GAME', payload }),
      pickCell: (payload) => dispatch({ type: 'PICK_CELL', payload }),
      cancelPick: () => dispatch({ type: 'CANCEL_PICK' }),
      consumeLifeline: (payload) => dispatch({ type: 'USE_LIFELINE', payload }),
      award: (teamId) => dispatch({ type: 'AWARD', payload: { teamId } }),
      adjustScore: (teamId, delta) => dispatch({ type: 'ADJUST_SCORE', payload: { teamId, delta } }),
      startChallenge: (payload) => dispatch({ type: 'START_CHALLENGE', payload }),
      awardChallenge: (teamId) => dispatch({ type: 'AWARD_CHALLENGE', payload: { teamId } }),
      cancelChallenge: () => dispatch({ type: 'CANCEL_CHALLENGE' }),
      reset: () => dispatch({ type: 'RESET' }),
    };
  }, [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
