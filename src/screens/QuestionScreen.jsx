import { useEffect, useRef, useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer, Lightbulb, Swords, Sparkles, ArrowRight, Eye, X as XIcon,
} from 'lucide-react';
import { ICON_MAP, getCategoryBySlug } from '../data/categories';
import { useGame } from '../contexts/GameContext';
import { useQuestion } from '../lib/queries';
import ExitGameButton from '../components/ExitGameButton';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.max(0, r)).padStart(2, '0')}`;
}

/**
 * Determine which TeamCell status to show for a given team index.
 * Phases: 'active-answering' → picker (active) is up; opposing waits.
 *         'opposing-answering' → opposing team is up; picker is done.
 *         'reveal' → both teams are done; host is awarding.
 */
function getTeamStatus(teamIdx, activeTeamIdx, phase) {
  const isPicker = teamIdx === activeTeamIdx;
  if (phase === 'reveal') return 'done';
  if (phase === 'active-answering') return isPicker ? 'answering' : 'waiting';
  if (phase === 'opposing-answering') return isPicker ? 'done' : 'answering';
  return 'done';
}

/* ─── TEAM CELL (top tracker) ─────────────────────────────────────────── */

function TeamCell({ team, status, secondaryTimer, answeredText }) {
  // status: 'answering' | 'waiting' | 'done'
  const isAnswering = status === 'answering';
  const isWaiting = status === 'waiting';
  const isDone = status === 'done';

  const bg = isAnswering
    ? `linear-gradient(135deg, ${team.color}30, var(--color-ink-50))`
    : 'var(--color-ink-50)';

  const border = isAnswering
    ? 'var(--color-gold)'
    : isDone
    ? `${team.color}aa`
    : 'var(--color-gold-faint)';

  const opacity = isWaiting ? 0.55 : 1;

  return (
    <div
      className="flex flex-col gap-1.5 px-3.5 py-3 rounded-lg border transition-all"
      style={{
        background: bg,
        borderColor: border,
        opacity,
        boxShadow: isAnswering
          ? 'var(--chip-active-shadow)'
          : 'none',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{team.emoji}</span>
        <div className="min-w-0">
          <div className="font-ar-body font-bold text-cream text-base leading-tight truncate">
            {team.name}
          </div>
          <div className="font-en-body text-cream-45 text-sm leading-tight truncate" lang="en">
            {team.nameEn}
            {answeredText && ` · said: "${answeredText}"`}
          </div>
        </div>
      </div>
      <div
        className="font-ar-ui text-xs flex items-center gap-1.5"
        style={{ color: isAnswering ? 'var(--color-gold-light)' : 'var(--color-cream-60)' }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isAnswering ? 'bg-gold animate-pulse-dot' : isDone ? 'bg-gold-light' : 'bg-cream-30'
          }`}
        />
        {isAnswering && (
          <>
            <span>يجيب الآن</span>
            <span className="opacity-70" lang="en">· Answering</span>
          </>
        )}
        {isWaiting && (
          <>
            <span>التالي · {formatTime(secondaryTimer)}</span>
            <span className="opacity-70" lang="en">· Up next</span>
          </>
        )}
        {isDone && (
          <>
            <span>أجاب</span>
            <span className="opacity-70" lang="en">· Done</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── DUAL TIMER ──────────────────────────────────────────────────────── */

function DualTimer({ primary, secondary, opposingTeamNameEn }) {
  const urgent = primary <= 5 && primary > 0;
  return (
    <div
      className="flex items-center gap-4 md:gap-5 px-4 py-3 rounded-lg border"
      style={{
        background: 'var(--color-ink-50)',
        borderColor: 'var(--color-gold-faint)',
      }}
    >
      <div className="flex flex-col">
        <span className="font-ar-ui text-sm text-gold-light tracking-wider uppercase">
          الوقت الأساسي · <span lang="en">Primary</span>
        </span>
        <motion.span
          key={Math.floor(primary)}
          initial={urgent ? { scale: 1.15 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.25 }}
          className="font-en-display font-bold leading-none"
          style={{
            fontSize: '36px',
            color: urgent ? '#C44150' : 'var(--color-gold)',
            textShadow: urgent
              ? 'var(--glow-text-crimson)'
              : 'var(--glow-text-gold)',
          }}
        >
          {formatTime(primary)}
        </motion.span>
      </div>
      <div className="w-px self-stretch bg-gold-faint mx-1" />
      <div className="flex flex-col opacity-60">
        <span className="font-ar-ui text-sm text-cream-60 tracking-wider uppercase">
          للفريق الآخر · <span lang="en">{opposingTeamNameEn} gets</span>
        </span>
        <span className="font-en-display font-semibold text-cream-60 text-xl leading-none">
          {formatTime(secondary)}
        </span>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────── */

// Local phase-machine reducer: atomic tick + phase advance.
// Keeps the dual-answer state out of the global GameContext (it's transient UI state).
function phaseReducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      if (state.phase === 'reveal') return state;
      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }
      // Hit zero — advance phase atomically with the same tick
      if (state.phase === 'active-answering') {
        return { ...state, phase: 'opposing-answering', timeLeft: state.secondaryTimer };
      }
      return { ...state, phase: 'reveal', timeLeft: 0 };
    }
    case 'END_TURN': {
      if (state.phase === 'active-answering') {
        return { ...state, phase: 'opposing-answering', timeLeft: state.secondaryTimer };
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
      };
    }
    default:
      return state;
  }
}

export default function QuestionScreen() {
  const navigate = useNavigate();
  const { state, consumeLifeline, award } = useGame();
  const { currentCell, teams, activeTeamIdx, timerSeconds, lifelinesUsed } = state;

  // Bounce back to /play if there's no current cell (e.g., direct URL hit)
  useEffect(() => {
    if (!currentCell) {
      navigate(state.started ? '/play' : '/setup', { replace: true });
    }
  }, [currentCell, state.started, navigate]);

  const PRIMARY_TIMER = timerSeconds || 30;
  const SECONDARY_TIMER = Math.floor(PRIMARY_TIMER / 2);

  // Active team gets the primary timer; opposing team gets the secondary.
  // Phase progression: active-answering → opposing-answering → reveal
  const opposingTeamIdx = 1 - activeTeamIdx;
  const activeTeam = teams[activeTeamIdx];
  const opposingTeam = teams[opposingTeamIdx];

  const category = useMemo(
    () => (currentCell ? getCategoryBySlug(currentCell.categorySlug) : null),
    [currentCell]
  );
  const cellValue = currentCell?.value ?? 0;
  const { data: Q } = useQuestion(category, cellValue, currentCell?.rowIdx ?? 0);
  const CategoryIcon = category ? ICON_MAP[category.icon] : null;

  // Local phase machine — useReducer so tick + phase advance are atomic
  const [phaseState, phaseDispatch] = useReducer(phaseReducer, undefined, () => ({
    phase: 'active-answering',
    timeLeft: PRIMARY_TIMER,
    secondaryTimer: SECONDARY_TIMER,
    hintShown: false,
  }));
  const { phase, timeLeft, hintShown } = phaseState;
  const intervalRef = useRef(null);

  // Reset local state whenever we land on a new cell
  useEffect(() => {
    phaseDispatch({
      type: 'RESET_FOR_CELL',
      primaryTimer: PRIMARY_TIMER,
      secondaryTimer: SECONDARY_TIMER,
    });
  }, [currentCell?.categorySlug, currentCell?.value, currentCell?.rowIdx, PRIMARY_TIMER, SECONDARY_TIMER]);

  const extraUsed = lifelinesUsed[activeTeamIdx]?.extraTime;
  const hintUsed = lifelinesUsed[activeTeamIdx]?.hint;

  // Countdown — single tick action, reducer handles phase advance atomically
  useEffect(() => {
    if (phase === 'reveal') return;
    intervalRef.current = setInterval(() => phaseDispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  const endTurn = () => phaseDispatch({ type: 'END_TURN' });

  const handleReveal = () => {
    clearInterval(intervalRef.current);
    phaseDispatch({ type: 'REVEAL_NOW' });
  };

  const handleExtraTime = () => {
    if (extraUsed) return;
    consumeLifeline({ teamIdx: activeTeamIdx, lifeline: 'extraTime' });
    phaseDispatch({ type: 'EXTEND_TIME', seconds: 30 });
  };

  const handleHint = () => {
    if (hintUsed) return;
    consumeLifeline({ teamIdx: activeTeamIdx, lifeline: 'hint' });
    phaseDispatch({ type: 'SHOW_HINT' });
  };

  const handleAward = (teamId) => {
    award(teamId);
    navigate('/play');
  };

  const isActiveAnswering = phase === 'active-answering';
  const isReveal = phase === 'reveal';

  const activeTurnTeamName = isActiveAnswering ? activeTeam?.name : opposingTeam?.name;
  const activeTurnTeamNameEn = isActiveAnswering ? activeTeam?.nameEn : opposingTeam?.nameEn;

  // If we got bounced before render, draw nothing
  if (!currentCell) return null;

  // Question is being fetched — render a soft loading skeleton instead of
  // the stub so the user briefly sees a neutral placeholder rather than
  // misleading "Sample question" text. With the RevealScreen prefetch this
  // path is almost never hit in practice (cache is hot before this mounts).
  if (!Q) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3" aria-busy="true">
          <span className="w-3 h-3 rounded-full bg-gold animate-pulse-dot" />
          <span className="font-ar-ui text-sm text-cream-60">
            جارٍ تحميل السؤال…{' '}
            <span className="font-en-body opacity-70" lang="en">
              Loading question…
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-5 md:px-8 md:py-8 max-w-4xl mx-auto">
      {/* Stage label + exit */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-ar-ui font-semibold uppercase tracking-wider"
          style={{
            background: isReveal ? 'rgba(212,162,76,0.22)' : 'rgba(212,162,76,0.12)',
            borderColor: 'var(--color-gold-faint)',
            color: isReveal ? 'var(--color-gold)' : 'var(--color-gold-light)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isReveal ? 'var(--color-gold-light)' : 'var(--color-gold)' }}
          />
          {isReveal ? 'المرحلة الثانية — الكشف والمنح' : 'المرحلة الأولى — الإجابة'}
          <span className="opacity-60 font-en-body normal-case tracking-normal" lang="en">
            · {isReveal ? 'Stage 2 · Reveal & Award' : 'Stage 1 · Answer Phase'}
          </span>
        </span>
        </div>
        <ExitGameButton variant="text" />
      </div>

      {/* Team tracker — stable positions: teams[0] always first, teams[1] always second.
          Status is derived per team based on activeTeamIdx so the gold ring always
          follows the actual answering team, regardless of who picked. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
        <TeamCell
          team={teams[0]}
          status={getTeamStatus(0, activeTeamIdx, phase)}
          secondaryTimer={SECONDARY_TIMER}
        />
        <span className="font-en-display italic text-gold/60 font-bold text-lg">vs</span>
        <TeamCell
          team={teams[1]}
          status={getTeamStatus(1, activeTeamIdx, phase)}
          secondaryTimer={SECONDARY_TIMER}
        />
      </div>

      {/* Category tag */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="accent-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-ar-body font-bold text-cream"
          style={{ background: category?.accent ?? '#173D6E' }}
        >
          {CategoryIcon && <CategoryIcon size={14} aria-hidden="true" />}
          {category?.ar}
        </span>
        <span
          className="font-en-body text-cream-45 text-xs tracking-wide uppercase"
          lang="en"
          dir="ltr"
        >
          {category?.en}
        </span>
        <span className="font-en-display text-gold font-bold text-lg ms-auto">· {cellValue}</span>
      </div>

      <AnimatePresence mode="wait">
        {!isReveal && (
          <motion.div
            key="answer-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* Dual timer */}
            <div className="mb-4">
              <DualTimer
                primary={timeLeft}
                secondary={SECONDARY_TIMER}
                opposingTeamNameEn={opposingTeam?.nameEn ?? 'Other team'}
              />
            </div>

            {/* Question card with ❖ corners */}
            <div
              className="relative rounded-xl px-6 py-8 md:px-10 md:py-10 mb-5 text-center"
              style={{
                background: 'var(--card-sapphire-grad)',
                border: '1.5px solid var(--color-gold-faint)',
                boxShadow: 'var(--card-sapphire-inset)',
              }}
            >
              <span className="absolute top-2 start-2 text-gold-light/70 text-sm leading-none" aria-hidden="true">❖</span>
              <span className="absolute top-2 end-2 text-gold-light/70 text-sm leading-none" aria-hidden="true">❖</span>
              <span className="absolute bottom-2 start-2 text-gold-light/70 text-sm leading-none" aria-hidden="true">❖</span>
              <span className="absolute bottom-2 end-2 text-gold-light/70 text-sm leading-none" aria-hidden="true">❖</span>

              <div className="font-ar-body font-bold text-cream text-2xl md:text-3xl leading-snug">
                {Q.ar}
              </div>
              <div className="font-en-display italic text-cream-60 text-base md:text-lg mt-3 leading-snug" lang="en">
                {Q.en}
              </div>

              {Q.imageUrl && (
                <div className="mt-5 flex justify-center">
                  <img
                    src={Q.imageUrl}
                    alt=""
                    loading="lazy"
                    className="max-h-64 md:max-h-80 w-auto rounded-lg border border-gold-faint shadow-lg"
                  />
                </div>
              )}

              {/* Hint reveal */}
              <AnimatePresence>
                {hintShown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 inline-block px-4 py-2 rounded-md border border-gold-faint bg-gold/10"
                  >
                    <div className="font-ar-ui text-sm text-gold-light flex items-center justify-center gap-1.5">
                      <Lightbulb size={14} /> تلميح: {Q.hintAr}
                    </div>
                    <div className="font-en-body text-cream-60 text-sm italic" lang="en">
                      {Q.hintEn}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lifelines (active team only) */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <button
                type="button"
                onClick={handleExtraTime}
                disabled={extraUsed}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition ${
                  extraUsed
                    ? 'opacity-30 cursor-not-allowed border-cream-30 bg-ink-50'
                    : 'border-gold-faint bg-ink-50 hover:border-gold/60 hover:bg-gold/5'
                }`}
              >
                <Timer size={22} className="text-gold" />
                <span className="font-ar-ui text-sm text-cream font-semibold">وقت إضافي</span>
                <span className="font-en-body text-sm text-cream-45 uppercase tracking-wide" lang="en">
                  Extra Time
                </span>
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={hintUsed}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition ${
                  hintUsed
                    ? 'opacity-30 cursor-not-allowed border-cream-30 bg-ink-50'
                    : 'border-gold-faint bg-ink-50 hover:border-gold/60 hover:bg-gold/5'
                }`}
              >
                <Lightbulb size={22} className="text-gold-light" />
                <span className="font-ar-ui text-sm text-cream font-semibold">تلميح</span>
                <span className="font-en-body text-sm text-cream-45 uppercase tracking-wide" lang="en">
                  Hint
                </span>
              </button>
              <button
                type="button"
                disabled
                title="Steal is being re-evaluated under the dual-answer flow"
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg border border-cream-30 bg-ink-50 opacity-40 cursor-not-allowed"
              >
                <Swords size={20} className="text-crimson" />
                <span className="font-ar-ui text-sm text-crimson font-semibold">سرقة</span>
                <span className="font-en-body text-sm text-crimson uppercase tracking-wide" lang="en">
                  Steal
                </span>
              </button>
            </div>

            {/* Bottom CTAs */}
            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={endTurn}
                className="btn-outline px-5 py-3 rounded-xl text-sm flex items-center gap-2"
              >
                <span>إنهاء دور {activeTurnTeamName}</span>
                <ArrowRight size={14} />
                <span className="font-en-body text-xs opacity-70" lang="en">
                  End {activeTurnTeamNameEn}'s Turn
                </span>
              </button>
              <button
                type="button"
                onClick={handleReveal}
                className="btn-gold px-6 py-3 rounded-xl text-sm flex items-center gap-2"
              >
                <Eye size={16} />
                <div className="flex flex-col items-center gap-0">
                  <span>كشف الإجابة</span>
                  <span className="font-en-body text-xs font-medium opacity-80" lang="en">
                    Reveal Answer
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {isReveal && (
          <motion.div
            key="reveal-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question (smaller, muted) */}
            <div className="px-4 py-3 rounded-md bg-ink-50 border border-gold-faint mb-4">
              <div className="font-ar-body text-cream-60 text-base">{Q.ar}</div>
              <div className="font-en-display italic text-cream-45 text-base mt-0.5" lang="en">
                {Q.en}
              </div>
            </div>

            {/* Correct answer reveal */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.1 }}
              className="rounded-xl px-6 py-5 mb-5 text-center"
              style={{
                background: 'var(--card-gold-reveal-grad)',
                border: '1.5px solid var(--color-gold)',
                boxShadow: 'var(--card-gold-reveal-shadow)',
              }}
            >
              <div className="font-ar-ui text-sm text-gold-light uppercase tracking-wider flex items-center justify-center gap-2 mb-1.5">
                <Sparkles size={14} />
                الإجابة الصحيحة
                <span className="opacity-70 font-en-body normal-case tracking-normal" lang="en">
                  · Correct Answer
                </span>
              </div>
              <div
                className="font-ar-body font-bold text-cream text-2xl md:text-3xl"
                style={{ textShadow: 'var(--glow-text-gold-soft)' }}
              >
                {Q.answerAr}
              </div>
              <div className="font-en-display italic text-cream-60 text-base mt-1" lang="en">
                {Q.answerEn}
              </div>
            </motion.div>

            {/* Award prompt */}
            <div className="text-center mb-4">
              <p className="font-ar-ui text-sm font-semibold text-gold-light">
                من يستحق {cellValue} نقطة؟
              </p>
              <p className="font-en-body text-cream-45 text-sm mt-0.5" lang="en">
                Who earns the {cellValue} points? Only one team wins this cell.
              </p>
            </div>

            {/* Award buttons */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5">
              <button
                type="button"
                onClick={() => handleAward(teams[0].id)}
                className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-lg border-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--award-team-bg)',
                  borderColor: `${teams[0].color}b3`,
                }}
              >
                <span className="text-2xl leading-none">{teams[0].emoji}</span>
                <span className="font-ar-ui text-sm font-bold text-cream">
                  منح {teams[0].name}
                </span>
                <span className="font-en-body text-sm text-cream-60 uppercase tracking-wide" lang="en">
                  Award · {teams[0].nameEn}
                </span>
                <span
                  className="font-en-display font-bold text-lg mt-0.5"
                  style={{ color: teams[0].color }}
                >
                  +{cellValue}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAward(null)}
                className="flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-lg border bg-ink-80 border-gold-faint text-cream-60 hover:border-cream-60 hover:text-cream transition min-w-[90px]"
              >
                <XIcon size={18} className="opacity-70" />
                <span className="font-ar-ui text-xs font-semibold">بلا منح</span>
                <span className="font-en-body text-xs uppercase tracking-wide" lang="en">
                  No Award
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAward(teams[1].id)}
                className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-lg border-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--award-team-bg)',
                  borderColor: `${teams[1].color}b3`,
                }}
              >
                <span className="text-2xl leading-none">{teams[1].emoji}</span>
                <span className="font-ar-ui text-sm font-bold text-cream">
                  منح {teams[1].name}
                </span>
                <span className="font-en-body text-sm text-cream-60 uppercase tracking-wide" lang="en">
                  Award · {teams[1].nameEn}
                </span>
                <span
                  className="font-en-display font-bold text-lg mt-0.5"
                  style={{ color: teams[1].color }}
                >
                  +{cellValue}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
