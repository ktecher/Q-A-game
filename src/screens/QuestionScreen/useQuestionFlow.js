import { useReducer, useEffect, useRef } from 'react';

// Local phase-machine reducer: atomic tick + phase advance.
// Keeps the dual-answer state out of the global GameContext (it's transient UI state).
function phaseReducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      if (state.phase === 'reveal' || state.paused) return state;
      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }
      // Hit zero — advance phase atomically with the same tick
      if (state.phase === 'active-answering') {
        return { ...state, phase: 'opposing-answering', timeLeft: state.secondaryTimer };
      }
      return { ...state, phase: 'reveal', timeLeft: 0 };
    }
    case 'TOGGLE_PAUSE': {
      if (state.phase === 'reveal') return state;
      return { ...state, paused: !state.paused };
    }
    case 'END_TURN': {
      if (state.phase === 'active-answering') {
        return { ...state, phase: 'opposing-answering', timeLeft: state.secondaryTimer, paused: false };
      }
      if (state.phase === 'opposing-answering') {
        return { ...state, phase: 'reveal', timeLeft: 0 };
      }
      return state;
    }
    case 'REVEAL_NOW': {
      return { ...state, phase: 'reveal', timeLeft: 0 };
    }
    case 'EXTEND_TIME': {
      return { ...state, timeLeft: state.timeLeft + action.seconds };
    }
    case 'SHOW_HINT': {
      return { ...state, hintShown: true };
    }
    case 'RESET_FOR_CELL': {
      return {
        phase: 'active-answering',
        timeLeft: action.primaryTimer,
        secondaryTimer: action.secondaryTimer,
        hintShown: false,
        paused: false,
      };
    }
    default:
      return state;
  }
}

export function useQuestionFlow({ currentCell, primaryTimer, secondaryTimer }) {
  // Local phase machine — useReducer so tick + phase advance are atomic
  const [phaseState, phaseDispatch] = useReducer(phaseReducer, undefined, () => ({
    phase: 'active-answering',
    timeLeft: primaryTimer,
    secondaryTimer: secondaryTimer,
    hintShown: false,
    paused: false,
  }));
  const intervalRef = useRef(null);

  // Reset local state whenever we land on a new cell
  useEffect(() => {
    phaseDispatch({
      type: 'RESET_FOR_CELL',
      primaryTimer,
      secondaryTimer,
    });
  }, [currentCell?.categorySlug, currentCell?.value, currentCell?.rowIdx, primaryTimer, secondaryTimer]);

  // Countdown — single tick action, reducer handles phase advance atomically.
  // Skips entirely when paused so the interval doesn't even spin needlessly.
  useEffect(() => {
    if (phaseState.phase === 'reveal' || phaseState.paused) return;
    intervalRef.current = setInterval(() => phaseDispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(intervalRef.current);
  }, [phaseState.phase, phaseState.paused]);

  return { phaseState, phaseDispatch, intervalRef };
}
