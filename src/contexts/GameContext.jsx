import { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { getCategoryBySlug, pickRandomSix } from '../data/categories';

// Bump when the persisted state shape changes in a non-backwards-compatible
// way — old localStorage entries are then ignored on load.
const STORAGE_KEY = 'uah.game_state';
const STORAGE_VERSION = 1;

function serializeState(state) {
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

function loadStoredState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return deserializeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * GameContext — single source of truth for an in-progress game.
 *
 * State shape:
 * {
 *   started: boolean,                  // true after START_GAME is dispatched
 *   categories: Category[],             // 6 chosen categories (in column order)
 *   teams: [Team, Team],                // exactly 2 teams
 *   activeTeamIdx: 0 | 1,               // who picks the next cell
 *   timerSeconds: number,                // primary timer (e.g., 30)
 *   difficulty: 'easy' | 'mixed' | 'hard',
 *   picked: Set<string>,                // composite keys "slug|value|rowIdx"
 *   currentCell: { categorySlug, value, rowIdx } | null,
 *   currentQuestion: Question | null,
 *   lifelinesUsed: { teamIdx: { extraTime: bool, hint: bool, steal: bool } }[],
 *   stats: { questionsAnswered, lifelinesUsed, longestStreak, currentStreak: { teamIdx, count } },
 *   gameOver: boolean,
 * }
 *
 * Each cell row: 6 categories × 6 difficulty rows (200/200/400/400/600/600) = 36 cells.
 */

const ROW_VALUES = [200, 200, 400, 400, 600, 600];
const CHALLENGE_CELLS_PER_GAME = 2;

// Pick N random cell keys ("slug|value|rowIdx") to be marked as Challenge cells.
// Hidden until picked (Daily Double-style surprise).
function pickChallengeCells(categories, n = CHALLENGE_CELLS_PER_GAME) {
  if (!categories || categories.length === 0) return new Set();
  const allKeys = [];
  for (let rowIdx = 0; rowIdx < ROW_VALUES.length; rowIdx++) {
    for (const cat of categories) {
      allKeys.push(`${cat.slug}|${ROW_VALUES[rowIdx]}|${rowIdx}`);
    }
  }
  // Fisher-Yates shuffle, take first n
  for (let i = allKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allKeys[i], allKeys[j]] = [allKeys[j], allKeys[i]];
  }
  return new Set(allKeys.slice(0, n));
}

// Default state used when GameProvider is mounted but no game has been started.
// Allows screens to render demo state when navigated directly via URL.
function createInitialState() {
  const slugs = pickRandomSix();
  const categories = slugs.map(getCategoryBySlug).filter(Boolean);
  return {
    started: false,
    categories,
    teams: [
      { id: 1, name: 'الفريق الأول', nameEn: 'Team Alpha', color: '#3A7BC8', emoji: '🦅', score: 0, players: [] },
      { id: 2, name: 'الفريق الثاني', nameEn: 'Team Beta',  color: '#9B2D3A', emoji: '🌙', score: 0, players: [] },
    ],
    activeTeamIdx: 0,
    timerSeconds: 30,
    difficulty: 'mixed',
    picked: new Set(),
    currentCell: null,
    currentQuestion: null,
    challengeCells: pickChallengeCells(categories),
    currentChallenge: null, // { categorySlug, value, rowIdx, prompt: { ar, en } } | null
    lifelinesUsed: [
      { extraTime: false, hint: false, steal: false },
      { extraTime: false, hint: false, steal: false },
    ],
    stats: {
      questionsAnswered: 0,
      lifelinesUsed: 0,
      longestStreak: 0,
      currentStreak: { teamIdx: null, count: 0 },
      challengesPlayed: 0,
    },
    gameOver: false,
  };
}

const TOTAL_CELLS = 6 * ROW_VALUES.length; // 36

function reducer(state, action) {
  switch (action.type) {
    case 'START_GAME': {
      const { categorySlugs, teams, difficulty, timerSeconds } = action.payload;
      const categories = categorySlugs.map(getCategoryBySlug).filter(Boolean);
      // Pad to 6 categories if fewer (shouldn't happen — Setup enforces 6)
      while (categories.length < 6) {
        const random = pickRandomSix().find((s) => !categories.some((c) => c.slug === s));
        if (random) categories.push(getCategoryBySlug(random));
        else break;
      }
      const finalCategories = categories.slice(0, 6);
      return {
        ...createInitialState(),
        started: true,
        categories: finalCategories,
        teams: teams.map((t, i) => ({
          ...state.teams[i],
          ...t,
          score: 0,
        })),
        difficulty: difficulty ?? 'mixed',
        timerSeconds: timerSeconds ?? 30,
        picked: new Set(),
        challengeCells: pickChallengeCells(finalCategories),
      };
    }

    case 'PICK_CELL': {
      const { categorySlug, value, rowIdx } = action.payload;
      const category = state.categories.find((c) => c.slug === categorySlug);
      if (!category) return state;
      const key = `${categorySlug}|${value}|${rowIdx}`;
      // Guard against duplicate picks (e.g., stale tab)
      if (state.picked.has(key)) return state;
      return {
        ...state,
        currentCell: { categorySlug, value, rowIdx },
        // currentQuestion is fetched by QuestionScreen via useQuestion() — keeps
        // the reducer sync-only and lets TanStack Query handle caching/refetch
        currentQuestion: null,
      };
    }

    case 'CANCEL_PICK': {
      // Used when user navigates away from /play/question without awarding
      // (Back button, refresh, etc.) — prevents stale-cell resume.
      if (!state.currentCell) return state;
      return { ...state, currentCell: null, currentQuestion: null };
    }

    case 'START_CHALLENGE': {
      // Triggered when a team accepts a Challenge cell.
      // payload: { categorySlug, value, rowIdx, prompt: { ar, en } }
      return {
        ...state,
        currentChallenge: action.payload,
        currentCell: null, // clear any pending normal-question state
        currentQuestion: null,
      };
    }

    case 'AWARD_CHALLENGE': {
      // payload: { teamId | null }
      // Winner gets DOUBLE the cell value. Loser gets nothing.
      // Either way, the cell is marked played and active team flips (strict alternation).
      const { teamId } = action.payload;
      if (!state.currentChallenge) return state;
      const ch = state.currentChallenge;
      const pickedKey = `${ch.categorySlug}|${ch.value}|${ch.rowIdx}`;
      const newPicked = new Set(state.picked);
      newPicked.add(pickedKey);

      let newTeams = state.teams;
      if (teamId) {
        const teamIdx = state.teams.findIndex((t) => t.id === teamId);
        if (teamIdx >= 0) {
          newTeams = state.teams.map((t, i) =>
            i === teamIdx ? { ...t, score: t.score + ch.value * 2 } : t
          );
        }
      }

      const newActiveTeamIdx = 1 - state.activeTeamIdx;
      const gameOver = newPicked.size >= TOTAL_CELLS;

      return {
        ...state,
        teams: newTeams,
        picked: newPicked,
        currentChallenge: null,
        activeTeamIdx: newActiveTeamIdx,
        stats: {
          ...state.stats,
          questionsAnswered: state.stats.questionsAnswered + 1,
          challengesPlayed: state.stats.challengesPlayed + 1,
        },
        gameOver,
      };
    }

    case 'CANCEL_CHALLENGE': {
      // User clicked Decline on the accept dialog — fall through to a normal pick.
      // Remove the challenge marker so re-tapping the cell doesn't re-trigger the popup,
      // and set currentCell so the BoardScreen routes to /play/question for a normal Q.
      if (!state.currentChallenge) return state;
      const ch = state.currentChallenge;
      const cellKey = `${ch.categorySlug}|${ch.value}|${ch.rowIdx}`;
      const newChallengeCells = new Set(state.challengeCells);
      newChallengeCells.delete(cellKey);
      return {
        ...state,
        currentChallenge: null,
        challengeCells: newChallengeCells,
        currentCell: { categorySlug: ch.categorySlug, value: ch.value, rowIdx: ch.rowIdx },
        currentQuestion: null,
      };
    }

    case 'ADJUST_SCORE': {
      // Manual host correction (e.g., wrong team awarded by mistake).
      // delta can be positive or negative. Scores are allowed to go negative.
      const { teamId, delta } = action.payload;
      if (!Number.isFinite(delta) || delta === 0) return state;
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === teamId ? { ...t, score: t.score + delta } : t
        ),
      };
    }

    case 'USE_LIFELINE': {
      const { teamIdx, lifeline } = action.payload;
      if (state.lifelinesUsed[teamIdx]?.[lifeline]) return state;
      const next = state.lifelinesUsed.map((l, i) =>
        i === teamIdx ? { ...l, [lifeline]: true } : l
      );
      return {
        ...state,
        lifelinesUsed: next,
        stats: { ...state.stats, lifelinesUsed: state.stats.lifelinesUsed + 1 },
      };
    }

    case 'AWARD': {
      // payload: { teamId | null }
      const { teamId } = action.payload;
      if (!state.currentCell) return state;
      const cell = state.currentCell;
      const pickedKey = `${cell.categorySlug}|${cell.value}|${cell.rowIdx}`;
      const newPicked = new Set(state.picked);
      newPicked.add(pickedKey);

      // Update teams + streak
      let newTeams = state.teams;
      let newStreak = state.stats.currentStreak;
      let newLongest = state.stats.longestStreak;
      if (teamId) {
        const teamIdx = state.teams.findIndex((t) => t.id === teamId);
        if (teamIdx >= 0) {
          newTeams = state.teams.map((t, i) =>
            i === teamIdx ? { ...t, score: t.score + cell.value } : t
          );
          // Streak tracking
          if (newStreak.teamIdx === teamIdx) {
            newStreak = { teamIdx, count: newStreak.count + 1 };
          } else {
            newStreak = { teamIdx, count: 1 };
          }
          if (newStreak.count > newLongest) newLongest = newStreak.count;
        }
      } else {
        // No award — streak resets
        newStreak = { teamIdx: null, count: 0 };
      }

      // Strict alternation: active team flips after every cell
      const newActiveTeamIdx = 1 - state.activeTeamIdx;

      // Game over when all 36 cells played
      const gameOver = newPicked.size >= TOTAL_CELLS;

      return {
        ...state,
        teams: newTeams,
        picked: newPicked,
        currentCell: null,
        currentQuestion: null,
        activeTeamIdx: newActiveTeamIdx,
        stats: {
          ...state.stats,
          questionsAnswered: state.stats.questionsAnswered + 1,
          longestStreak: newLongest,
          currentStreak: newStreak,
        },
        gameOver,
      };
    }

    case 'RESET': {
      return createInitialState();
    }

    default:
      return state;
  }
}

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
