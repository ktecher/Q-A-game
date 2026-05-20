import { useState, useEffect, useReducer, useRef } from 'react';

const TOTAL_TIME = 30;

function namingReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      if (state.timeLeft <= 0) return state;
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'NAMED':
      // Current player named one — increment their count, swap turn
      return {
        ...state,
        counts: state.counts.map((c, i) => (i === state.turnTeamIdx ? c + 1 : c)),
        turnTeamIdx: 1 - state.turnTeamIdx,
      };
    case 'CHOKE':
      // Current player failed — other team wins immediately
      return { ...state, ended: true, chokeTeamIdx: state.turnTeamIdx };
    case 'TIME_UP':
      return { ...state, ended: true, timeLeft: 0 };
    default:
      return state;
  }
}

/**
 * useNamingFlow — encapsulates the alternating-turn timer + reducer for the
 * naming phase of a challenge. Extracted from the old NamingPhase modal so the
 * new full-screen NamingStage can render the data without owning the logic.
 *
 * onEnd is invoked once with { counts, chokeTeamIdx } after a brief delay when
 * the round ends (either time-up or choke).
 */
export default function useNamingFlow({ startingTeamIdx, onEnd }) {
  const [s, dispatch] = useReducer(namingReducer, {
    timeLeft: TOTAL_TIME,
    turnTeamIdx: startingTeamIdx,
    counts: [0, 0],
    ended: false,
    chokeTeamIdx: null,
  });
  const [started, setStarted] = useState(false);
  const intervalRef = useRef(null);

  // Countdown — only ticks once started
  useEffect(() => {
    if (!started || s.ended) return;
    intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, s.ended]);

  // Auto-end when timer hits 0
  useEffect(() => {
    if (!s.ended && s.timeLeft === 0) dispatch({ type: 'TIME_UP' });
  }, [s.timeLeft, s.ended]);

  // Notify parent when round ends (brief delay for visual punctuation)
  useEffect(() => {
    if (s.ended) {
      const t = setTimeout(
        () => onEnd({ counts: s.counts, chokeTeamIdx: s.chokeTeamIdx }),
        600,
      );
      return () => clearTimeout(t);
    }
  }, [s.ended, s.counts, s.chokeTeamIdx, onEnd]);

  return { state: s, dispatch, started, setStarted };
}
