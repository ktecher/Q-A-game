import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer, Lightbulb, Swords, Sparkles, ArrowRight, Eye, Pause, Play,
} from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { ICON_MAP, getCategoryBySlug } from '../../data/categories';
import { useGame } from '../../contexts/GameContext';
import { useQuestion } from '../../lib/queries';
import ExitGameButton from '../../components/ExitGameButton';
import AwardButtons from '../../components/AwardButtons';
import TeamCell from './TeamCell';
import DualTimer from './DualTimer';
import { useQuestionFlow } from './useQuestionFlow';

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

  const { phaseState, phaseDispatch, intervalRef } = useQuestionFlow({
    currentCell,
    primaryTimer: PRIMARY_TIMER,
    secondaryTimer: SECONDARY_TIMER,
  });
  const { phase, timeLeft, hintShown, paused } = phaseState;

  const extraUsed = lifelinesUsed[activeTeamIdx]?.extraTime;
  const hintUsed = lifelinesUsed[activeTeamIdx]?.hint;

  const endTurn = () => phaseDispatch({ type: 'END_TURN' });
  const togglePause = () => phaseDispatch({ type: 'TOGGLE_PAUSE' });

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

            {/* Question card with ❖ corners.
                Padding tightens when an image or QR is present so the whole
                screen still fits on a ~768-900px viewport. Text-only cards
                keep the roomier padding so corner ornaments don't collide
                with the question text. */}
            <div
              className={`relative rounded-xl mb-4 text-center ${
                Q.imageUrl || Q.qrUrl
                  ? 'px-5 py-5 md:px-7 md:py-6'
                  : 'px-5 py-6 md:px-7 md:py-8'
              }`}
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

              <div className="font-ar-body font-bold text-cream text-xl md:text-2xl leading-snug">
                {Q.ar}
              </div>
              <div className="font-en-display italic text-cream-60 text-sm md:text-base mt-2 leading-snug" lang="en">
                {Q.en}
              </div>

              {Q.qrUrl && (
                <div className="mt-3 flex justify-center">
                  <div className="bg-white rounded-xl p-3 inline-block">
                    <QRCode
                      value={Q.qrUrl}
                      size={180}
                      bgColor="#FFFFFF"
                      fgColor="#0A0F1A"
                      level="M"
                    />
                  </div>
                </div>
              )}

              {Q.imageUrl && (
                <div className="mt-3 flex justify-center">
                  <img
                    src={Q.imageUrl}
                    alt=""
                    loading="lazy"
                    className="max-h-[38vh] md:max-h-72 max-w-sm w-auto rounded-lg border border-gold-faint shadow-lg"
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
                    className="mt-3 inline-block px-4 py-2 rounded-md border border-gold-faint bg-gold/10"
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
                onClick={togglePause}
                aria-pressed={paused}
                title={paused ? 'استئناف · Resume timer' : 'إيقاف · Pause timer'}
                className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 border transition ${
                  paused
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-gold-faint bg-ink-50 text-cream-60 hover:border-gold/60 hover:text-gold'
                }`}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
                <div className="flex flex-col items-center gap-0">
                  <span>{paused ? 'استئناف' : 'إيقاف'}</span>
                  <span className="font-en-body text-xs opacity-70" lang="en">
                    {paused ? 'Resume' : 'Pause'}
                  </span>
                </div>
              </button>
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
            <AwardButtons teams={teams} value={cellValue} onAward={handleAward} variant="full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
