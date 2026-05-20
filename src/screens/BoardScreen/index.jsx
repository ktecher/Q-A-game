import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Pause } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { cellKey } from '../../lib/cellKey';
import { pickN } from '../../lib/random';
import { usePrefetchQuestions, useChallengePrompts } from '../../lib/queries';
import ExitGameButton from '../../components/ExitGameButton';
import ScoreAdjustDialog from '../../components/ScoreAdjustDialog';
import ThemeToggle from '../../components/ThemeToggle';
import TeamChip from './TeamChip';
import CategoryHeader from './CategoryHeader';
import BoardCell from './BoardCell';

export default function BoardScreen() {
  const navigate = useNavigate();
  const { state, pickCell, startChallenge, rowValues, totalCells } = useGame();
  const { categories, teams, picked, challengeCells, activeTeamIdx, gameOver } = state;
  const [adjustingTeamId, setAdjustingTeamId] = useState(null);
  const adjustingTeam = teams.find((t) => t.id === adjustingTeamId) ?? null;

  // Bulk-prefetch all questions for the 6 chosen categories so when user picks
  // a cell, the question is already in cache — no stub-then-real flash.
  usePrefetchQuestions(categories);

  // Warm the challenge prompts cache so picks are instant.
  const { data: prompts } = useChallengePrompts();

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

  const handlePick = (cat, value, rowIdx) => {
    const key = cellKey(cat.slug, value, rowIdx);
    if (challengeCells?.has(key)) {
      // Surprise! Open the Challenge Round modal in-place; no nav.
      // Accept → naming round; Decline → fall through via CANCEL_CHALLENGE → normal Q.
      if (prompts.length === 0) {
        // Prompts not loaded yet (network error) — fall through to normal question.
        console.warn('[BoardScreen] challenge_prompts not loaded; falling through to normal question');
        pickCell({ categorySlug: cat.slug, value, rowIdx });
        return;
      }
      startChallenge({
        categorySlug: cat.slug,
        value,
        rowIdx,
        prompt: pickN(prompts, 1)[0],
      });
      return;
    }
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
