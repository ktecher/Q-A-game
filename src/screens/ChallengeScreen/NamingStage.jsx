import { formatTime } from '../../lib/format';
import useNamingFlow from './useNamingFlow';

/* ─── NAMING STAGE · full-screen face-off ──────────────────────────────
   Layout (md+):
     ┌──────────┬──────────────────────┬──────────┐
     │ TEAM A   │  category · prompt   │ TEAM B   │
     │ panel    │  ┌────────────────┐  │ panel    │
     │ name     │  │  big timer     │  │ name     │
     │ status   │  turn indicator      │ status   │
     │ count    │  [Choke]   [Named]   │ count    │
     └──────────┴──────────────────────┴──────────┘
   On mobile: collapses to vertical stack (panels above and below center). */

// P1 is the blue side of the cabinet, P2 the red one — same as the board HUD.
const SIDES = [
  { border: 'var(--blue)', panel: 'var(--blue-p)', ink: 'var(--blue)', label: 'P1' },
  { border: 'var(--red)', panel: 'var(--red-p)', ink: 'var(--red)', label: 'P2' },
];

export default function NamingStage({ prompt, teams, startingTeamIdx, cellValue, onEnd }) {
  const { state, dispatch, started, setStarted } = useNamingFlow({
    startingTeamIdx,
    onEnd,
  });
  const urgent = state.timeLeft <= 5 && started && !state.ended;
  const turnTeam = teams[state.turnTeamIdx];
  const otherTeam = teams[1 - state.turnTeamIdx];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        padding: '20px 32px 30px',
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'linear-gradient(var(--grid-alt) 2px, transparent 2px), linear-gradient(90deg, var(--grid-alt) 2px, transparent 2px)',
        backgroundSize: '32px 32px, 32px 32px',
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 shrink-0" style={{ marginBottom: 18 }}>
        <span
          className="font-en-body leading-none animate-blink"
          style={{ fontSize: 12, color: 'var(--purple)', letterSpacing: '0.22em' }}
          lang="en"
        >
          ! BONUS DUEL !
        </span>
        <span
          className="font-en-body leading-none"
          style={{
            fontSize: 12,
            color: 'var(--outline)',
            background: 'var(--gold)',
            padding: '8px 10px',
          }}
          lang="en"
        >
          {cellValue * 2} PTS
        </span>
      </header>

      {/* Face-off row */}
      <div
        className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] items-stretch"
        style={{ gap: 18 }}
      >
        <TeamPanel
          team={teams[0]}
          side={SIDES[0]}
          active={started && !state.ended && state.turnTeamIdx === 0}
          ended={state.ended}
          count={state.counts[0]}
          choked={state.chokeTeamIdx === 0}
        />

        <div className="flex flex-col items-center justify-center text-center" style={{ gap: 14 }}>
          <div>
            <p
              className="font-ar-body font-bold"
              style={{
                fontSize: 'clamp(30px, 3.4vw, 62px)',
                lineHeight: 1.1,
                color: 'var(--text)',
                textShadow: '4px 4px 0 var(--shadow)',
              }}
            >
              {prompt.ar}
            </p>
            <p
              className="font-en-body uppercase"
              style={{ fontSize: 'clamp(10px, 1vw, 14px)', lineHeight: 1.8, color: 'var(--muted)', marginTop: 10 }}
              lang="en"
            >
              {prompt.en}
            </p>
          </div>

          <div
            className={`font-ar-body font-extrabold leading-none tabular-nums ${urgent ? 'animate-flash' : ''}`}
            style={{
              fontSize: 'clamp(64px, 12vw, 132px)',
              color: urgent ? 'var(--red-ink)' : 'var(--gold-ink)',
              textShadow: urgent ? '6px 6px 0 var(--red-d)' : '6px 6px 0 var(--gold-sh)',
            }}
            dir="ltr"
          >
            {formatTime(state.timeLeft)}
          </div>

          {!started ? (
            <PreStart
              startingTeamName={teams[startingTeamIdx].nameEn}
              onStart={() => setStarted(true)}
            />
          ) : !state.ended ? (
            <InProgress
              turnTeam={turnTeam}
              otherTeam={otherTeam}
              onChoke={() => dispatch({ type: 'CHOKE' })}
              onNamed={() => dispatch({ type: 'NAMED' })}
            />
          ) : (
            <EndedState ended={state} />
          )}
        </div>

        <TeamPanel
          team={teams[1]}
          side={SIDES[1]}
          active={started && !state.ended && state.turnTeamIdx === 1}
          ended={state.ended}
          count={state.counts[1]}
          choked={state.chokeTeamIdx === 1}
        />
      </div>
    </div>
  );
}

/* ─── Side team panel ─────────────────────────────────────────────── */

function TeamPanel({ team, side, active, ended, count, choked }) {
  const isActive = active && !ended;
  const status = ended ? (choked ? 'CHOKED' : 'DONE') : active ? 'YOUR TURN' : 'WAITING';

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        gap: 10,
        padding: 18,
        background: isActive ? side.panel : 'var(--panel)',
        border: `4px solid ${isActive ? 'var(--gold)' : side.border}`,
        boxShadow: isActive ? '0 8px 0 var(--gold-sh)' : '0 8px 0 var(--shadow)',
        opacity: !active && !ended ? 0.6 : 1,
      }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <span
          className="shrink-0"
          style={{ width: 22, height: 22, background: team.color, border: '3px solid var(--outline)' }}
        />
        <span
          className="font-en-body leading-none"
          style={{ fontSize: 11, color: side.ink }}
          lang="en"
        >
          {side.label}
        </span>
        {isActive && (
          <span
            className="animate-blink shrink-0"
            style={{ width: 12, height: 12, background: 'var(--gold)' }}
            aria-hidden="true"
          />
        )}
      </div>

      <span
        className="font-ar-body font-bold leading-none truncate max-w-full"
        style={{ fontSize: 30, color: 'var(--text)' }}
      >
        {team.name}
      </span>

      <span
        className="font-en-body leading-none"
        style={{
          fontSize: 9,
          color: isActive ? 'var(--outline)' : 'var(--muted2)',
          background: isActive ? 'var(--gold)' : 'transparent',
          padding: isActive ? '6px 8px' : 0,
          letterSpacing: '0.1em',
        }}
        lang="en"
      >
        {status}
      </span>

      <span
        className="font-ar-body font-extrabold leading-none"
        style={{ fontSize: 48, color: side.ink }}
        dir="ltr"
      >
        {count}
      </span>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: 'var(--muted)' }}
        lang="en"
      >
        NAMED
      </span>
    </div>
  );
}

function PreStart({ startingTeamName, onStart }) {
  return (
    <>
      <p
        className="font-en-body"
        style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.8, letterSpacing: '0.08em' }}
        lang="en"
      >
        READ THE PROMPT · PRESS START WHEN BOTH PLAYERS ARE READY
      </p>
      <button
        type="button"
        onClick={onStart}
        className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
        style={{
          padding: '16px 26px',
          background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
          border: '4px solid var(--outline)',
          boxShadow: '0 8px 0 var(--gold-sh)',
          color: 'var(--outline)',
        }}
      >
        <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 34 }}>
          ابدأ التحدي
        </span>{' '}
        <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
          START
        </span>
      </button>
      <p
        className="font-en-body"
        style={{ fontSize: 9, color: 'var(--muted2)', letterSpacing: '0.08em' }}
        lang="en"
      >
        {startingTeamName.toUpperCase()} GOES FIRST · 30S CLOCK
      </p>
    </>
  );
}

function InProgress({ turnTeam, otherTeam, onChoke, onNamed }) {
  return (
    <>
      <p
        className="font-ar-body font-bold leading-none"
        style={{ fontSize: 30, color: 'var(--gold-ink)' }}
      >
        دور {turnTeam.name}
      </p>
      <p
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}
        lang="en"
      >
        {turnTeam.nameEn.toUpperCase()}&apos;S TURN — NAME ONE
      </p>
      <div className="grid grid-cols-2 w-full" style={{ gap: 14, maxWidth: 460 }}>
        <button
          type="button"
          onClick={onChoke}
          className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
          style={{
            padding: 16,
            background: 'var(--red-p)',
            border: '4px solid var(--red)',
            boxShadow: '0 8px 0 var(--red-d)',
          }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30, color: 'var(--red-ink)' }}>
            ✕ عجز
          </span>
          <span
            className="block font-en-body leading-none"
            style={{ fontSize: 9, color: 'var(--muted)', marginTop: 8 }}
            lang="en"
          >
            {otherTeam.nameEn.toUpperCase()} WINS
          </span>
        </button>
        <button
          type="button"
          onClick={onNamed}
          className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
          style={{
            padding: 16,
            background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
            border: '4px solid var(--outline)',
            boxShadow: '0 8px 0 var(--gold-sh)',
            color: 'var(--outline)',
          }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30 }}>
            ✓ إجابة
          </span>
          <span className="block font-en-body leading-none" style={{ fontSize: 9, marginTop: 8 }} lang="en">
            PASS TO {otherTeam.nameEn.toUpperCase()}
          </span>
        </button>
      </div>
    </>
  );
}

function EndedState({ ended }) {
  const isChoke = ended.chokeTeamIdx !== null;
  return (
    <>
      <p
        className="font-ar-body font-extrabold leading-none"
        style={{ fontSize: 40, color: 'var(--gold-ink)', textShadow: '4px 4px 0 var(--gold-sh)' }}
      >
        {isChoke ? 'توقف اللعب' : 'انتهى الوقت'}
      </p>
      <p
        className="font-en-body leading-none"
        style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em' }}
        lang="en"
      >
        {isChoke ? 'ROUND ENDED ON A CHOKE' : "TIME'S UP"}
      </p>
    </>
  );
}
