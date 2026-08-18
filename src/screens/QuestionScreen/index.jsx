import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
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

// The four 12×12 gold corner squares on the hero card — they replace the old
// ❖ diamonds, whose curves fight the pixel grid.
const CARD_CORNERS = [
  { top: 8, insetInlineStart: 8 },
  { top: 8, insetInlineEnd: 8 },
  { bottom: 8, insetInlineStart: 8 },
  { bottom: 8, insetInlineEnd: 8 },
];

// Rail lifeline rows. `pause` is a live toggle here, not the spent-state mock
// the reference sheet shows.
const LIFELINE_TONE = {
  gold: { border: 'var(--gold)', square: 'var(--gold)', tag: 'var(--gold-ink)' },
  green: { border: 'var(--green)', square: 'var(--green)', tag: 'var(--green)' },
  spent: { border: 'var(--line)', square: 'var(--line)', tag: 'var(--muted2)' },
};

function LifelineRow({ ar, en, tone, disabled, onClick, pressed, title }) {
  const t = LIFELINE_TONE[disabled ? 'spent' : tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
      className="flex items-center gap-2.5 w-full transition-transform duration-100 disabled:cursor-not-allowed enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px]"
      style={{
        padding: '10px 12px',
        background: disabled ? 'var(--cleared-bg)' : 'var(--panel2)',
        border: `4px solid ${t.border}`,
        boxShadow: disabled ? 'none' : '0 5px 0 var(--shadow)',
      }}
    >
      <span className="shrink-0" style={{ width: 22, height: 22, background: t.square }} />
      <span
        className="font-ar-body font-bold leading-none"
        style={{ fontSize: 26, color: disabled ? 'var(--muted2)' : 'var(--text)' }}
      >
        {ar}
      </span>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: t.tag, marginInlineStart: 'auto' }}
        lang="en"
      >
        {en}
      </span>
    </button>
  );
}

export default function QuestionScreen() {
  const navigate = useNavigate();
  const { state, consumeLifeline, award } = useGame();
  const { currentCell, teams, activeTeamIdx, timerSeconds, lifelinesUsed, gameSeed } = state;

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

  // The chosen category comes from the in-progress game state (carries the
  // database-sourced visuals + kind) — not the local code file.
  const category = useMemo(
    () =>
      currentCell
        ? state.categories.find((c) => c.slug === currentCell.categorySlug) ?? null
        : null,
    [currentCell, state.categories]
  );
  const cellValue = currentCell?.value ?? 0;
  const { data: Q } = useQuestion(category, cellValue, currentCell?.rowIdx ?? 0, gameSeed);

  const { phaseState, phaseDispatch } = useQuestionFlow({
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
    // Phase → 'reveal' makes useQuestionFlow's countdown effect tear down the
    // interval via its cleanup; the hook owns the interval, so no imperative
    // clear here (that was a second owner racing the effect).
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
          <span className="animate-blink" style={{ width: 14, height: 14, background: 'var(--gold)' }} />
          <span className="font-ar-body font-bold" style={{ fontSize: 26, color: 'var(--text)' }}>
            جارٍ تحميل السؤال…
          </span>
          <span className="font-en-body" style={{ fontSize: 10, color: 'var(--muted)' }} lang="en">
            LOADING QUESTION…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Stage bar */}
      <div
        className="flex items-center justify-between gap-3"
        style={{
          padding: '12px 20px',
          background: 'var(--panel)',
          borderBottom: '4px solid var(--gold-d)',
        }}
      >
        <span
          className="font-en-body leading-none shrink-0"
          style={{
            fontSize: 12,
            color: 'var(--outline)',
            background: isReveal ? 'var(--green)' : 'var(--gold)',
            padding: '8px 10px',
          }}
          lang="en"
        >
          {isReveal ? 'STAGE 2 · AWARD' : 'STAGE 1 · ANSWER'}
        </span>
        <span
          className="font-ar-body font-bold leading-none truncate"
          style={{ fontSize: 30, color: 'var(--text)' }}
        >
          {isReveal ? 'المرحلة الثانية — الكشف والمنح' : 'المرحلة الأولى — الإجابة'}
        </span>
        <ExitGameButton variant="text" />
      </div>

      {!isReveal && (
        <div
          className="flex-1 grid gap-5 md:grid-cols-[240px_1fr]"
          style={{ padding: '22px 24px' }}
        >
          {/* ── Rail: timer, both teams, lifelines ── */}
          <div className="flex flex-col gap-4">
            <DualTimer
              timeLeft={timeLeft}
              max={PRIMARY_TIMER}
              secondary={SECONDARY_TIMER}
              opposingLabel={`P${opposingTeamIdx + 1}`}
            />

            <TeamCell
              team={teams[0]}
              status={getTeamStatus(0, activeTeamIdx, phase)}
              accent="var(--blue)"
            />
            <TeamCell
              team={teams[1]}
              status={getTeamStatus(1, activeTeamIdx, phase)}
              accent="var(--red)"
            />

            <div className="flex flex-col gap-2.5">
              <LifelineRow
                ar="وقت إضافي"
                en="+30S"
                tone="gold"
                disabled={extraUsed}
                onClick={handleExtraTime}
              />
              <LifelineRow
                ar="تلميح"
                en="HINT"
                tone="green"
                disabled={hintUsed}
                onClick={handleHint}
              />
              <LifelineRow
                ar={paused ? 'استئناف' : 'إيقاف'}
                en={paused ? 'RESUME' : 'PAUSE'}
                tone={paused ? 'gold' : 'green'}
                onClick={togglePause}
                pressed={paused}
                title={paused ? 'استئناف · Resume timer' : 'إيقاف · Pause timer'}
              />
            </div>
          </div>

          {/* ── Main: category, question hero, actions ── */}
          <div className="flex flex-col gap-3.5 min-w-0">
            <div className="flex items-center gap-3">
              <span
                className="accent-card font-ar-body font-bold leading-none truncate"
                style={{
                  fontSize: 26,
                  color: 'var(--text)',
                  background: category?.accent ?? '#0F2A4D',
                  border: '4px solid var(--blue)',
                  padding: '4px 12px',
                }}
              >
                {category?.ar}
              </span>
              <span
                className="font-en-body leading-none truncate uppercase"
                style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}
                lang="en"
                dir="ltr"
              >
                {category?.en}
              </span>
              <span
                className="font-en-body leading-none shrink-0"
                style={{
                  fontSize: 12,
                  color: 'var(--outline)',
                  background: 'var(--gold)',
                  padding: '8px 10px',
                  marginInlineStart: 'auto',
                }}
                lang="en"
              >
                {cellValue} PTS
              </span>
            </div>

            {/* Question card — the hero */}
            <div
              className="relative flex-1 flex flex-col items-center justify-center gap-4 text-center"
              style={{
                background: 'var(--panel)',
                border: '6px solid var(--gold)',
                boxShadow: 'inset 0 0 0 4px var(--outline), 0 10px 0 var(--shadow)',
                padding: '36px 40px',
              }}
            >
              {CARD_CORNERS.map((pos, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute"
                  style={{ ...pos, width: 12, height: 12, background: 'var(--gold)' }}
                />
              ))}

              <div
                className="font-ar-body font-bold"
                style={{
                  // The sheet sets a flat 62px against one short sample question.
                  // Real rows vary in length, so this scales down rather than
                  // overflowing the card.
                  fontSize: 'clamp(32px, 3.4vw, 62px)',
                  lineHeight: 1.1,
                  color: 'var(--text)',
                  textShadow: '4px 4px 0 var(--shadow)',
                }}
              >
                {Q.ar}
              </div>
              <div
                className="font-en-body uppercase"
                style={{
                  fontSize: 'clamp(10px, 1vw, 14px)',
                  lineHeight: 1.8,
                  color: 'var(--muted)',
                }}
                lang="en"
              >
                {Q.en}
              </div>

              {Q.qrUrl && (
                <div style={{ background: '#F4ECD8', border: '4px solid var(--outline)', padding: 12 }}>
                  <QRCode value={Q.qrUrl} size={180} bgColor="#F4ECD8" fgColor="#070A12" level="M" />
                </div>
              )}

              {Q.imageUrl && (
                <img
                  src={Q.imageUrl}
                  alt=""
                  loading="lazy"
                  className="pixel-art max-h-[34vh] w-auto"
                  style={{ border: '4px solid var(--outline)' }}
                />
              )}

              {hintShown && (
                <div
                  className="flex items-center gap-2.5"
                  style={{
                    background: 'var(--cleared-bg)',
                    border: '4px solid var(--green)',
                    padding: '8px 14px',
                  }}
                >
                  <span className="shrink-0" style={{ width: 14, height: 14, background: 'var(--green)' }} />
                  <span
                    className="font-ar-body font-bold leading-none"
                    style={{ fontSize: 26, color: 'var(--green)' }}
                  >
                    تلميح: {Q.hintAr}
                  </span>
                </div>
              )}
            </div>

            {/* Action row */}
            <div className="flex gap-3.5">
              <button
                type="button"
                onClick={endTurn}
                className="flex-1 text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
                style={{
                  padding: 16,
                  background: 'var(--panel2)',
                  border: '4px solid var(--blue)',
                  boxShadow: '0 8px 0 var(--shadow)',
                }}
              >
                <span
                  className="font-ar-body font-bold leading-none"
                  style={{ fontSize: 30, color: 'var(--text)' }}
                >
                  إنهاء دور {activeTurnTeamName}
                </span>{' '}
                <span
                  className="font-en-body leading-none"
                  style={{ fontSize: 10, color: 'var(--muted)' }}
                  lang="en"
                >
                  END TURN ▸
                </span>
              </button>
              <button
                type="button"
                onClick={handleReveal}
                className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
                style={{
                  flex: 1.5,
                  padding: 16,
                  background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
                  border: '4px solid var(--outline)',
                  boxShadow: '0 8px 0 var(--gold-sh)',
                  color: 'var(--outline)',
                }}
              >
                <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 34 }}>
                  كشف الإجابة
                </span>{' '}
                <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
                  REVEAL
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isReveal && (
        <div
          className="flex-1 w-full mx-auto flex flex-col"
          style={{ maxWidth: 1000, padding: '26px 32px', gap: 18 }}
        >
          {/* Question recap */}
          <div
            style={{
              background: 'var(--cleared-bg)',
              border: '4px solid var(--line)',
              padding: '12px 16px',
            }}
          >
            <div
              className="font-ar-body font-semibold leading-none"
              style={{ fontSize: 30, color: 'var(--muted)' }}
            >
              {Q.ar}
            </div>
            <div
              className="font-en-body uppercase leading-none"
              style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 8 }}
              lang="en"
            >
              {Q.en}
            </div>
          </div>

          {/* Correct answer */}
          <div
            className="text-center"
            style={{
              background: 'var(--panel3)',
              border: '6px solid var(--green)',
              boxShadow: 'inset 0 0 0 4px var(--outline), 0 10px 0 var(--shadow)',
              padding: 28,
            }}
          >
            <div
              className="font-en-body leading-none"
              style={{ fontSize: 12, color: 'var(--green)', letterSpacing: '0.18em' }}
            >
              <span lang="en">CORRECT ANSWER · </span>الإجابة الصحيحة
            </div>
            <div
              className="font-ar-body font-extrabold"
              style={{
                fontSize: 'clamp(44px, 5vw, 96px)',
                lineHeight: 1,
                color: 'var(--gold-ink)',
                marginTop: 10,
                textShadow: '6px 6px 0 var(--gold-sh)',
              }}
            >
              {Q.answerAr}
            </div>
            <div
              className="font-en-body uppercase"
              style={{ fontSize: 'clamp(12px, 1.4vw, 20px)', color: 'var(--text)', marginTop: 10 }}
              lang="en"
            >
              {Q.answerEn}
            </div>
          </div>

          {/* Award prompt */}
          <div className="text-center">
            <div
              className="font-ar-body font-bold leading-none"
              style={{ fontSize: 40, color: 'var(--text)' }}
            >
              من يستحق {cellValue} نقطة؟
            </div>
            <div
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.1em' }}
              lang="en"
            >
              ONE TEAM TAKES THE BLOCK
            </div>
          </div>

          <AwardButtons teams={teams} value={cellValue} onAward={handleAward} />
        </div>
      )}
    </div>
  );
}
