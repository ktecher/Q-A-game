import { getCategoryBySlug, pickRandomSix } from '../data/categories';
import { pickN } from './random';
import { cellKey } from './cellKey';
import { makeReducerTeams } from './teams';
import { CATEGORIES_PER_GAME } from './gameDefaults';

export { cellKey };

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
 *   gameSeed: number,                    // per-game seed for stable random picks
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

export const ROW_VALUES = [200, 200, 400, 400, 600, 600];

const CHALLENGE_CELLS_PER_GAME = 2;

// Pick N random cell keys ("slug|value|rowIdx") to be marked as Challenge cells.
// Hidden until picked (Daily Double-style surprise). When `enabled` is false the
// player turned challenge rounds off in Setup — return an empty Set so no cell
// ever triggers the challenge flow (BoardScreen's `challengeCells.has()` check
// then always falls through to a normal question).
function pickChallengeCells(categories, enabled = true, n = CHALLENGE_CELLS_PER_GAME) {
  if (!enabled || !categories || categories.length === 0) return new Set();
  const allKeys = [];
  for (let rowIdx = 0; rowIdx < ROW_VALUES.length; rowIdx++) {
    for (const cat of categories) {
      allKeys.push(cellKey(cat.slug, ROW_VALUES[rowIdx], rowIdx));
    }
  }
  return new Set(pickN(allKeys, n));
}

// A fresh per-game seed. Every random question/challenge pick for the game is
// derived from this one number, so the selection is decided once and stays
// stable across component remounts — no duplicate questions. See lib/random.js.
// Exported so gameStorage can backfill it onto a pre-seed saved game.
export function makeGameSeed() {
  return Math.floor(Math.random() * 0x100000000);
}

// Default state used when GameProvider is mounted but no game has been started.
// Allows screens to render demo state when navigated directly via URL.
export function createInitialState() {
  const slugs = pickRandomSix();
  const categories = slugs.map(getCategoryBySlug).filter(Boolean);
  return {
    started: false,
    categories,
    teams: makeReducerTeams(),
    activeTeamIdx: 0,
    timerSeconds: 30,
    difficulty: 'mixed',
    gameSeed: makeGameSeed(),
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

export function reducer(state, action) {
  switch (action.type) {
    case 'START_GAME': {
      const {
        categorySlugs,
        categories: pickedCategories,
        teams, difficulty, timerSeconds, challengesEnabled = true,
      } = action.payload;
      // Prefer full category objects passed from Setup — they carry the
      // database-sourced visuals (image, icon, accent, kind). Fall back to
      // hydrating slugs from the local catalog for legacy/direct callers.
      const categories =
        pickedCategories && pickedCategories.length > 0
          ? pickedCategories.filter(Boolean)
          : (categorySlugs ?? []).map(getCategoryBySlug).filter(Boolean);
      // Pad to CATEGORIES_PER_GAME if fewer (shouldn't happen — Setup enforces it)
      while (categories.length < CATEGORIES_PER_GAME) {
        const random = pickRandomSix().find((s) => !categories.some((c) => c.slug === s));
        if (random) categories.push(getCategoryBySlug(random));
        else break;
      }
      const finalCategories = categories.slice(0, CATEGORIES_PER_GAME);
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
        challengeCells: pickChallengeCells(finalCategories, challengesEnabled),
      };
    }

    case 'PICK_CELL': {
      const { categorySlug, value, rowIdx } = action.payload;
      const category = state.categories.find((c) => c.slug === categorySlug);
      if (!category) return state;
      const key = cellKey(categorySlug, value, rowIdx);
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
      const pickedKey = cellKey(ch.categorySlug, ch.value, ch.rowIdx);
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
      const key = cellKey(ch.categorySlug, ch.value, ch.rowIdx);
      const newChallengeCells = new Set(state.challengeCells);
      newChallengeCells.delete(key);
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
      const pickedKey = cellKey(cell.categorySlug, cell.value, cell.rowIdx);
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
