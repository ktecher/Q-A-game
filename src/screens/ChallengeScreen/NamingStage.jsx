import { motion } from 'framer-motion';
import { Zap, X as XIcon, Check, Hand, Play } from 'lucide-react';
import { formatTime } from '../../lib/format';
import TeamIdentity from '../../components/TeamIdentity';
import useNamingFlow from './useNamingFlow';

/* ─── NAMING STAGE · full-screen face-off ──────────────────────────────
   Layout (md+):
     ┌──────────┬──────────────────────┬──────────┐
     │ TEAM A   │  category · prompt   │ TEAM B   │
     │ panel    │  ┌────────────────┐  │ panel    │
     │ avatar   │  │  big timer     │  │ avatar   │
     │ name     │  └────────────────┘  │ name     │
     │ status   │  turn indicator      │ status   │
     │ count    │  [Choke]   [Named]   │ count    │
     └──────────┴──────────────────────┴──────────┘
   On mobile: collapses to vertical stack (panels above and below center). */

export default function NamingStage({ prompt, teams, startingTeamIdx, cellValue, onEnd }) {
  const { state, dispatch, started, setStarted } = useNamingFlow({
    startingTeamIdx,
    onEnd,
  });
  const urgent = state.timeLeft <= 5 && started && !state.ended;
  const turnTeam = teams[state.turnTeamIdx];
  const otherTeam = teams[1 - state.turnTeamIdx];

  return (
    <motion.div
      key="naming"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col px-4 py-5 md:px-8 md:py-7"
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-ar-ui font-semibold uppercase tracking-wider bg-gold/15 border border-gold-faint"
          style={{ color: 'var(--color-gold)' }}
        >
          <Zap size={15} />
          جولة التحدي
          <span className="font-en-body normal-case tracking-normal opacity-80" lang="en">
            · Challenge Round
          </span>
        </div>
        <span className="font-en-body text-xs md:text-sm text-gold-light font-mono">
          Stakes: <span className="font-bold">{cellValue * 2}</span> pts to winner
        </span>
      </header>

      {/* Face-off row */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4 md:gap-6 items-stretch">
        <TeamPanel
          team={teams[0]}
          active={started && !state.ended && state.turnTeamIdx === 0}
          ended={state.ended}
          count={state.counts[0]}
          choked={state.chokeTeamIdx === 0}
        />

        <div className="flex flex-col items-center justify-center text-center px-2 py-4">
          {/* Big prompt */}
          <div className="mb-4">
            <p className="font-ar-body font-bold text-cream text-3xl md:text-4xl lg:text-5xl leading-tight">
              {prompt.ar}
            </p>
            <p className="font-en-display italic text-cream-60 text-base md:text-lg mt-2" lang="en">
              {prompt.en}
            </p>
          </div>

          {/* Massive timer */}
          <motion.div
            key={state.timeLeft}
            initial={urgent ? { scale: 1.12 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className="font-en-display font-bold leading-none my-3"
            style={{
              fontSize: 'clamp(72px, 14vw, 132px)',
              letterSpacing: '-0.04em',
              color: urgent ? '#C44150' : 'var(--color-gold)',
              textShadow: urgent
                ? 'var(--glow-text-crimson-wide)'
                : 'var(--glow-text-gold-deep)',
            }}
          >
            {formatTime(state.timeLeft)}
          </motion.div>

          {/* Pre-start / In-progress / Ended state */}
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
          active={started && !state.ended && state.turnTeamIdx === 1}
          ended={state.ended}
          count={state.counts[1]}
          choked={state.chokeTeamIdx === 1}
        />
      </div>
    </motion.div>
  );
}

/* ─── Side team panel ─────────────────────────────────────────────── */

function TeamPanel({ team, active, ended, count, choked }) {
  const isActive = active && !ended;
  const status = ended
    ? choked
      ? 'CHOKED'
      : 'DONE'
    : active
      ? 'YOUR TURN'
      : 'WAITING';
  return (
    <div
      className="relative rounded-2xl px-4 py-5 md:px-6 md:py-7 flex flex-col items-center text-center border transition-all"
      style={{
        borderColor: isActive ? 'var(--color-gold)' : `${team.color}aa`,
        background: isActive
          ? `linear-gradient(135deg, ${team.color}99, var(--color-ink-50))`
          : 'var(--color-ink-50)',
        boxShadow: isActive ? 'var(--chip-active-shadow)' : 'none',
        opacity: !active && !ended ? 0.6 : 1,
      }}
    >
      {isActive && (
        <span
          className="absolute top-3 end-3 w-2.5 h-2.5 rounded-full animate-pulse-dot"
          style={{ background: 'var(--color-gold-light)', boxShadow: '0 0 10px var(--color-gold-light)' }}
          aria-hidden="true"
        />
      )}

      <div className="mb-3 mt-1">
        <TeamIdentity team={team} size="lg" />
      </div>

      <div
        className="px-3 py-1 rounded-full border text-[10px] md:text-xs font-bold uppercase tracking-wider mb-4"
        style={{
          background: isActive ? 'var(--color-gold)' : 'var(--color-ink-80)',
          borderColor: isActive ? 'var(--color-gold)' : 'var(--color-gold-faint)',
          color: isActive ? 'var(--color-ink)' : 'var(--color-cream-60)',
        }}
      >
        {status}
      </div>

      <div className="w-full pt-3 border-t border-gold-faint">
        <div
          className="font-en-display font-bold text-4xl md:text-5xl leading-none"
          style={{ color: team.color }}
        >
          {count}
        </div>
        <div className="font-en-body text-[10px] md:text-xs uppercase tracking-wider text-cream-45 mt-1" lang="en">
          named
        </div>
      </div>
    </div>
  );
}

function PreStart({ startingTeamName, onStart }) {
  return (
    <>
      <div className="font-ar-ui text-base text-cream-60 mb-1">
        اقرأ السؤال جيدًا. اضغط "ابدأ" حين يكون اللاعبان جاهزَين.
      </div>
      <div className="font-en-body text-sm text-cream-45 mb-5" lang="en">
        Read the prompt. Click Start when both players are ready.
      </div>
      <button
        type="button"
        onClick={onStart}
        className="btn-gold px-8 py-4 rounded-2xl flex items-center gap-3"
      >
        <Play size={22} />
        <div className="flex flex-col items-start gap-0">
          <span className="font-ar-ui text-lg font-bold">ابدأ التحدي</span>
          <span className="font-en-body text-sm opacity-85" lang="en">
            Start Challenge
          </span>
        </div>
      </button>
      <p className="mt-4 font-en-body text-xs text-cream-45" lang="en">
        {startingTeamName} goes first. The 30-second clock starts when you press Start.
      </p>
    </>
  );
}

function InProgress({ turnTeam, otherTeam, onChoke, onNamed }) {
  return (
    <>
      <div className="font-ar-ui text-lg md:text-xl text-cream-60 mb-1">
        دور <span className="text-gold-light font-bold">{turnTeam.name}</span> الآن
      </div>
      <div className="font-en-body text-sm text-cream-45 mb-5 flex items-center gap-1 justify-center" lang="en">
        <Hand size={12} className="text-gold/65" />
        {turnTeam.nameEn}'s turn — name one
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={onChoke}
          className="px-4 py-4 md:py-5 rounded-2xl border-2 border-crimson/60 bg-crimson/10 text-crimson hover:bg-crimson/20 hover:border-crimson transition-colors duration-150"
        >
          <div className="flex items-center justify-center gap-1.5">
            <XIcon size={18} />
            <span className="font-ar-ui text-lg font-bold">عجز!</span>
          </div>
          <div className="font-en-body text-xs opacity-75 mt-1" lang="en">
            {turnTeam.nameEn} choked · {otherTeam.nameEn} wins
          </div>
        </button>
        <button
          type="button"
          onClick={onNamed}
          className="btn-gold px-4 py-4 md:py-5 rounded-2xl"
        >
          <div className="flex items-center justify-center gap-1.5">
            <Check size={18} />
            <span className="font-ar-ui text-lg font-bold">إجابة!</span>
          </div>
          <div className="font-en-body text-xs font-medium opacity-80 mt-1" lang="en">
            Named one · pass to {otherTeam.nameEn}
          </div>
        </button>
      </div>
    </>
  );
}

function EndedState({ ended }) {
  const isChoke = ended.chokeTeamIdx !== null;
  return (
    <div className="font-ar-ui text-2xl text-gold-light font-bold">
      {isChoke ? 'تم! اللعب توقف' : 'انتهى الوقت!'}
      <div className="font-en-body text-sm text-cream-60 mt-1 italic" lang="en">
        {isChoke ? 'Round ended on a choke' : "Time's up!"}
      </div>
    </div>
  );
}
