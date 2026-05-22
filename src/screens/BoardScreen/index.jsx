import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Pause } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { cellKey } from '../../lib/cellKey';
import { seededShuffle, seededPickN, seedFrom } from '../../lib/random';
import { makeSessionId } from '../../lib/sketchEncoding';
import {
  usePrefetchQuestions,
  useChallengePrompts,
  useDrawingWords,
  useAppSettings,
} from '../../lib/queries';
import ExitGameButton from '../../components/ExitGameButton';
import ScoreAdjustDialog from '../../components/ScoreAdjustDialog';
import ThemeToggle from '../../components/ThemeToggle';
import TeamChip from './TeamChip';
import CategoryHeader from './CategoryHeader';
import BoardCell from './BoardCell';

export default function BoardScreen() {
  const navigate = useNavigate();
  const { state, pickCell, startChallenge, rowValues, totalCells } = useGame();
  const { categories, teams, picked, challengeCells, activeTeamIdx, gameOver, gameSeed } = state;
  const [adjustingTeamId, setAdjustingTeamId] = useState(null);
  const adjustingTeam = teams.find((t) => t.id === adjustingTeamId) ?? null;

  // Bulk-prefetch all questions for the 6 chosen categories so when user picks
  // a cell, the question is already in cache — no stub-then-real flash. The
  // gameSeed makes every remount re-seed the cache identically (no re-roll).
  usePrefetchQuestions(categories, gameSeed);

  // Warm the challenge prompts cache so picks are instant.
  const { data: prompts } = useChallengePrompts();
  // Drawing-challenge word pool + the admin feature flags. Both have offline
  // fallbacks, so they are always defined.
  const { data: drawingWords } = useDrawingWords();
  const { data: settings } = useAppSettings();

  // If game ended, kick to results
  useEffect(() => {
    if (gameOver) navigate('/play/results', { replace: true });
  }, [gameOver, navigate]);

  // If user lands on /play directly without starting, send to setup
  useEffect(() => {
    if (!state.started) navigate('/setup', { replace: true });
  }, [state.started, navigate]);

  // Whenever currentCell is set (from PICK_CELL or CANCEL_CHALLENGE → fall-through),
  // route to the question screen.
  useEffect(() => {
    if (state.currentCell) navigate('/play/question');
  }, [state.currentCell, navigate]);

  // Whenever a challenge is started, route to the dedicated challenge screen.
  useEffect(() => {
    if (state.currentChallenge) navigate('/play/challenge');
  }, [state.currentChallenge, navigate]);

  // Deal each surprise challenge cell its variant + content ONCE per game.
  // Derived from the game seed (stable across remounts); each cell takes the
  // next unused item from a seeded-shuffled pool — and falls back to the other
  // variant if its own pool runs dry — so the two challenge cells never land
  // on the same drawing word / naming prompt.
  const challengeAssignments = useMemo(() => {
    const keys = [...(challengeCells ?? [])].sort();
    if (keys.length === 0) return {};

    // Which challenge types are usable: the admin Settings page enables each,
    // and the naming round also needs a loaded challenge_prompts pool.
    const variants = [];
    if (settings.naming_challenge_enabled && prompts.length > 0) variants.push('naming');
    if (settings.sketch_challenge_enabled) variants.push('sketch');
    if (variants.length === 0) return {}; // no type available → all fall through

    // Pre-shuffled pools; monotonic cursors hand out each item at most once.
    const wordOrder = seededShuffle(drawingWords, seedFrom(gameSeed, 'sketch-words'));
    const promptOrder = seededShuffle(prompts, seedFrom(gameSeed, 'naming-prompts'));
    let wi = 0;
    let pi = 0;
    const dealSketch = () =>
      wi < wordOrder.length ? { variant: 'sketch', word: wordOrder[wi++] } : null;
    const dealNaming = () =>
      pi < promptOrder.length ? { variant: 'naming', prompt: promptOrder[pi++] } : null;

    const out = {};
    for (const key of keys) {
      const variant = seededPickN(variants, 1, seedFrom(gameSeed, 'variant', key))[0];
      // Take from the chosen variant's pool; if it is spent, borrow the other.
      const assignment =
        variant === 'sketch' ? dealSketch() ?? dealNaming() : dealNaming() ?? dealSketch();
      if (assignment) out[key] = assignment; // both pools spent → normal question
    }
    return out;
  }, [gameSeed, challengeCells, settings, prompts, drawingWords]);

  const handlePick = (cat, value, rowIdx) => {
    const key = cellKey(cat.slug, value, rowIdx);
    const assignment = challengeAssignments[key];

    if (challengeCells?.has(key) && assignment) {
      // Surprise! A challenge cell — variant + content were dealt at game start.
      if (assignment.variant === 'sketch') {
        const { word } = assignment;
        startChallenge({
          categorySlug: cat.slug,
          value,
          rowIdx,
          variant: 'sketch',
          sessionId: makeSessionId(),
          prompt: { ar: word.ar, en: word.en },
          catAr: word.catAr,
          catEn: word.catEn,
        });
        return;
      }
      startChallenge({
        categorySlug: cat.slug,
        value,
        rowIdx,
        variant: 'naming',
        prompt: assignment.prompt,
      });
      return;
    }

    // Normal cell — or a challenge cell with no usable challenge type.
    pickCell({ categorySlug: cat.slug, value, rowIdx });
  };

  const playedCount = picked.size;

  return (
    <div className="min-h-screen px-4 py-5 md:px-8 md:py-8">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 mb-5 md:mb-7">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-ar-body text-gold text-base md:text-lg">أم الهيمان</span>
          <span className="text-gold-light/60">❖</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <TeamChip
            team={teams[0]}
            isActive={activeTeamIdx === 0}
            onAdjust={() => setAdjustingTeamId(teams[0].id)}
          />
          <span className="font-en-display italic text-gold/60 text-base md:text-lg">vs</span>
          <TeamChip
            team={teams[1]}
            isActive={activeTeamIdx === 1}
            onAdjust={() => setAdjustingTeamId(teams[1].id)}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle size={14} />
          <button
            type="button"
            aria-label="Toggle sound"
            className="w-10 h-10 rounded-full surface flex items-center justify-center text-gold/70 hover:text-gold transition-colors duration-150"
          >
            <Volume2 size={16} />
          </button>
          <button
            type="button"
            aria-label="Pause"
            className="w-10 h-10 rounded-full surface flex items-center justify-center text-gold/70 hover:text-gold transition-colors duration-150"
          >
            <Pause size={16} />
          </button>
          <ExitGameButton variant="icon" />
        </div>
      </header>

      {/* Progress meta */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-en-body text-cream-45 text-sm" lang="en">
          {playedCount} / {totalCells} questions answered
        </div>
        <span className="font-en-body text-cream-45 text-xs uppercase tracking-wider" lang="en">
          {teams[activeTeamIdx]?.nameEn} picks
        </span>
      </div>

      {/* The Board */}
      <div
        className="grid gap-1 md:gap-1.5"
        style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
      >
        {/* Row 0: category headers */}
        {categories.map((cat) => (
          <CategoryHeader key={`hdr-${cat.slug}`} category={cat} />
        ))}

        {/* Body rows: 6 difficulty tiers × 6 categories */}
        {rowValues.map((value, rowIdx) =>
          categories.map((cat) => {
            const key = cellKey(cat.slug, value, rowIdx);
            const isPicked = picked.has(key);
            return (
              <BoardCell
                key={key}
                category={cat}
                value={value}
                isPicked={isPicked}
                onPick={(c, v) => handlePick(c, v, rowIdx)}
              />
            );
          })
        )}
      </div>

      {/* Score-adjust modal */}
      <ScoreAdjustDialog team={adjustingTeam} onClose={() => setAdjustingTeamId(null)} />
    </div>
  );
}
