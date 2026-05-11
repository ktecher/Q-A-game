import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Pause, X, Pencil } from 'lucide-react';
import { ICON_MAP } from '../data/categories';
import { useGame } from '../contexts/GameContext';
import { pickRandomPrompt } from '../data/challengePrompts';
import { usePrefetchQuestions } from '../lib/queries';
import ExitGameButton from '../components/ExitGameButton';
import ScoreAdjustDialog from '../components/ScoreAdjustDialog';
import ChallengeRound from '../components/ChallengeRound';
import ThemeToggle from '../components/ThemeToggle';

function tierClasses(value) {
  if (value === 200) {
    return {
      bg: 'var(--tier-easy-bg)',
      ring: 'var(--tier-easy-ring)',
      hoverShadow: 'var(--tier-easy-hover)',
      textColor: 'var(--tier-easy-text)',
      textShadow: 'var(--tier-easy-text-shadow)',
      size: 24,
    };
  }
  if (value === 400) {
    return {
      bg: 'var(--tier-mid-bg)',
      ring: 'var(--tier-mid-ring)',
      hoverShadow: 'var(--tier-mid-hover)',
      textColor: 'var(--tier-mid-text)',
      textShadow: 'var(--tier-mid-text-shadow)',
      size: 28,
    };
  }
  // 600 — deepest, with crimson accent
  return {
    bg: 'var(--tier-hard-bg)',
    ring: 'var(--tier-hard-ring)',
    hoverShadow: 'var(--tier-hard-hover)',
    textColor: 'var(--tier-hard-text)',
    textShadow: 'var(--tier-hard-text-shadow)',
    size: 32,
    showSparkle: true,
  };
}

function TeamChip({ team, isActive, onAdjust }) {
  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Click to adjust score"
      aria-label={`Adjust ${team.nameEn} score (currently ${team.score})`}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-gold/10 border-gold shadow-gold-glow scale-105'
          : 'bg-ink-50 border-gold-faint hover:border-gold/60'
      }`}
      style={
        isActive
          ? { boxShadow: 'var(--chip-active-shadow)' }
          : undefined
      }
    >
      <span className="text-2xl leading-none">{team.emoji}</span>
      <div className="flex flex-col items-start min-w-0">
        <div className="font-ar-body font-bold text-cream text-base leading-tight truncate max-w-[140px]">
          {team.name}
        </div>
        <div className="font-en-body text-cream-45 text-xs leading-tight" lang="en">
          {team.nameEn}
        </div>
      </div>
      <div className="flex items-center gap-1 ms-2">
        <span
          className="font-en-display font-bold text-2xl leading-none"
          style={{ color: isActive ? 'var(--color-gold)' : team.color }}
        >
          {team.score}
        </span>
      </div>
      {isActive && (
        <span
          className="w-2 h-2 rounded-full bg-gold animate-pulse-dot ms-1 shrink-0"
          aria-label="Active team"
        />
      )}
      {/* Hover hint (pencil icon) — appears only on hover */}
      <Pencil
        size={11}
        className="absolute top-1.5 end-1.5 text-cream-45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        aria-hidden="true"
      />
    </button>
  );
}

function CategoryHeader({ category }) {
  const Icon = ICON_MAP[category.icon];
  return (
    <div
      className="accent-card relative flex flex-col items-center justify-end gap-0.5 px-1.5 py-2 rounded-t-lg text-center overflow-hidden min-h-[70px] sm:min-h-[84px]"
      style={{
        background: `linear-gradient(180deg, ${category.accent} 0%, ${category.accent}cc 100%)`,
        boxShadow: 'var(--tier-category-header-shadow)',
      }}
    >
      {category.imageUrl ? (
        <>
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 mix-blend-multiply opacity-45"
            style={{ background: category.accent }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        Icon && (
          <Icon
            size={24}
            className="text-cream/95"
            strokeWidth={1.6}
            aria-hidden="true"
          />
        )
      )}
      <div className="relative font-ar-body font-bold text-cream text-sm sm:text-base leading-tight drop-shadow">
        {category.ar}
      </div>
      <div
        className="relative font-en-body text-cream/80 text-[11px] sm:text-xs leading-tight tracking-wide drop-shadow"
        lang="en"
      >
        {category.en}
      </div>
    </div>
  );
}

function BoardCell({ category, value, isPicked, onPick }) {
  const tier = tierClasses(value);

  if (isPicked) {
    return (
      <div
        aria-label="Already played"
        className="relative aspect-[5/3] rounded-lg flex items-center justify-center bg-ink-80 border border-gold-faint/40 opacity-30"
      >
        <X size={22} className="text-cream-60" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(category, value)}
      className="relative aspect-[5/3] rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-ink [will-change:transform] transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97]"
      style={{
        background: tier.bg,
        boxShadow: tier.ring,
      }}
      aria-label={`${category.ar} · ${category.en} · ${value} نقطة`}
    >
      {/* Tier hover glow */}
      <span
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
        style={{ boxShadow: tier.hoverShadow }}
      />
      {/* 600-tier corner sparkle */}
      {tier.showSparkle && (
        <span
          className="absolute top-1 end-1 text-cream/40 text-[10px] leading-none"
          aria-hidden="true"
        >
          ✦
        </span>
      )}
      <span
        className="font-en-display font-bold leading-none"
        style={{
          fontSize: `${tier.size}px`,
          color: tier.textColor,
          textShadow: tier.textShadow,
        }}
      >
        {value}
      </span>
    </button>
  );
}

export default function BoardScreen() {
  const navigate = useNavigate();
  const { state, pickCell, startChallenge, rowValues, totalCells } = useGame();
  const { categories, teams, picked, challengeCells, currentChallenge, activeTeamIdx, gameOver } = state;
  const [adjustingTeamId, setAdjustingTeamId] = useState(null);
  const adjustingTeam = teams.find((t) => t.id === adjustingTeamId) ?? null;

  // Bulk-prefetch all questions for the 6 chosen categories so when user picks
  // a cell, the question is already in cache — no stub-then-real flash.
  usePrefetchQuestions(categories);

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

  const handlePick = (cat, value, rowIdx) => {
    const key = `${cat.slug}|${value}|${rowIdx}`;
    if (challengeCells?.has(key)) {
      // Surprise! Open the Challenge Round modal in-place; no nav.
      // Accept → naming round; Decline → fall through via CANCEL_CHALLENGE → normal Q.
      startChallenge({
        categorySlug: cat.slug,
        value,
        rowIdx,
        prompt: pickRandomPrompt(),
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
            const key = `${cat.slug}|${value}|${rowIdx}`;
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

      {/* Footer hint */}
      <p className="mt-6 text-center font-en-body text-cream-45 text-sm" lang="en">
        Tap a cell to open the question. Tap a team chip to adjust their score.
      </p>

      {/* Score-adjust modal */}
      <ScoreAdjustDialog team={adjustingTeam} onClose={() => setAdjustingTeamId(null)} />

      {/* Challenge round modal — only mounts when currentChallenge is set */}
      {currentChallenge && <ChallengeRound />}
    </div>
  );
}
