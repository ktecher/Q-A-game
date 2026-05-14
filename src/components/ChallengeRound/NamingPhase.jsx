import { useState, useEffect, useReducer, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, X as XIcon, Check, ChevronsRight, Hand, Play } from 'lucide-react';

const TOTAL_TIME = 30; // seconds for the whole round, alternating word-by-word

/* ─── PHASE-2 NAMING · alternating word-by-word ───────────────────────── */

function namingReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      if (state.timeLeft <= 0) return state;
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'NAMED':
      // Current player named one — increment their count, swap turn, reset stale timer
      return {
        ...state,
        counts: state.counts.map((c, i) => (i === state.turnTeamIdx ? c + 1 : c)),
        turnTeamIdx: 1 - state.turnTeamIdx,
      };
    case 'CHOKE':
      // Current player failed — other team wins immediately
      return { ...state, ended: true, chokeTeamIdx: state.turnTeamIdx };
    case 'TIME_UP':
      return { ...state, ended: true, timeLeft: 0 };
    default:
      return state;
  }
}

export default function NamingPhase({ prompt, teams, startingTeamIdx, cellValue, onEnd }) {
  const [s, dispatch] = useReducer(namingReducer, {
    timeLeft: TOTAL_TIME,
    turnTeamIdx: startingTeamIdx,
    counts: [0, 0],
    ended: false,
    chokeTeamIdx: null,
  });
  // Ready state — show the prompt + Start button before the timer begins.
  // Lets players read and prepare; the host clicks Start when both sides are ready.
  const [started, setStarted] = useState(false);
  const intervalRef = useRef(null);

  // Countdown — only ticks once started
  useEffect(() => {
    if (!started || s.ended) return;
    intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, s.ended]);

  // Auto-end when timer hits 0
  useEffect(() => {
    if (!s.ended && s.timeLeft === 0) dispatch({ type: 'TIME_UP' });
  }, [s.timeLeft, s.ended]);

  // Notify parent when round ends
  useEffect(() => {
    if (s.ended) {
      const t = setTimeout(() => onEnd({ counts: s.counts, chokeTeamIdx: s.chokeTeamIdx }), 600);
      return () => clearTimeout(t);
    }
  }, [s.ended, s.counts, s.chokeTeamIdx, onEnd]);

  const turnTeam = teams[s.turnTeamIdx];
  const otherTeam = teams[1 - s.turnTeamIdx];
  const urgent = s.timeLeft <= 5;

  return (
    <motion.div
      key="naming"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="surface px-6 py-6 max-w-2xl w-full text-center relative"
      style={{
        background: 'var(--card-gold-mid-grad)',
        border: `2px solid ${urgent ? '#C44150' : 'var(--color-gold)'}`,
        boxShadow: urgent
          ? 'var(--card-gold-mid-shadow-urgent)'
          : 'var(--card-gold-mid-shadow)',
      }}
    >
      {/* Stage label */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-xs font-ar-ui font-semibold text-gold uppercase tracking-wider">
        <Zap size={13} />
        جولة التحدي ·{' '}
        <span className="font-en-body normal-case tracking-normal opacity-80" lang="en">
          Challenge Round
        </span>
      </div>

      {/* Big prompt */}
      <div className="mt-5">
        <p className="font-ar-body font-bold text-cream text-2xl md:text-3xl leading-snug">
          {prompt.ar}
        </p>
        <p className="font-en-display italic text-cream-60 text-base md:text-lg mt-1" lang="en">
          {prompt.en}
        </p>
      </div>

      {/* Timer */}
      <motion.div
        key={s.timeLeft}
        initial={urgent ? { scale: 1.15 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25 }}
        className="mt-5 font-en-display font-bold leading-none"
        style={{
          fontSize: '64px',
          color: urgent ? '#C44150' : 'var(--color-gold)',
          textShadow: urgent
            ? 'var(--glow-text-crimson-wide)'
            : 'var(--glow-text-gold-deep)',
        }}
      >
        0:{String(s.timeLeft).padStart(2, '0')}
      </motion.div>

      {/* Whose turn — chips active only after Start */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <TeamTurnChip team={teams[0]} isActive={started && !s.ended && s.turnTeamIdx === 0} count={s.counts[0]} />
        <Hand size={14} className="text-gold/65" />
        <TeamTurnChip team={teams[1]} isActive={started && !s.ended && s.turnTeamIdx === 1} count={s.counts[1]} />
      </div>

      {!started ? (
        // ── PRE-START · prompt visible, timer paused at 0:30, host clicks Start ──
        <>
          <div className="mt-3 font-ar-ui text-base text-cream-60">
            اقرأ السؤال جيدًا. اضغط "ابدأ" حين يكون اللاعبان جاهزَين.
          </div>
          <div className="font-en-body text-sm text-cream-45 mt-0.5" lang="en">
            Read the prompt. Click Start when both players are ready.
          </div>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="btn-gold px-8 py-3.5 rounded-xl flex items-center gap-2.5"
            >
              <Play size={18} />
              <div className="flex flex-col items-center gap-0">
                <span className="font-ar-ui text-base font-bold">ابدأ التحدي</span>
                <span className="font-en-body text-sm font-medium opacity-85" lang="en">
                  Start Challenge
                </span>
              </div>
            </button>
          </div>
          <p className="mt-3 font-en-body text-xs text-cream-45" lang="en">
            {teams[startingTeamIdx].nameEn} goes first. The 30-second clock starts when you press Start.
          </p>
        </>
      ) : !s.ended ? (
        <>
          <div className="mt-2 font-ar-ui text-base text-cream-60">
            دور <span className="text-gold-light font-bold">{turnTeam.name}</span> الآن
          </div>
          <div className="font-en-body text-sm text-cream-45 mt-0.5" lang="en">
            {turnTeam.nameEn}'s turn — name one item
          </div>

          {/* Host controls */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => dispatch({ type: 'CHOKE' })}
              className="px-3 py-3 rounded-xl border-2 border-crimson/60 bg-crimson/10 text-crimson hover:bg-crimson/20 hover:border-crimson transition-colors duration-150"
            >
              <div className="flex items-center justify-center gap-1.5">
                <XIcon size={14} />
                <span className="font-ar-ui text-sm font-bold">عجز!</span>
              </div>
              <div className="font-en-body text-xs opacity-70 mt-0.5" lang="en">
                {turnTeam.nameEn} choked · {otherTeam.nameEn} wins
              </div>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'NAMED' })}
              className="btn-gold px-3 py-3 rounded-xl"
            >
              <div className="flex items-center justify-center gap-1.5">
                <Check size={16} />
                <span className="font-ar-ui text-sm font-bold">إجابة!</span>
              </div>
              <div className="font-en-body text-xs font-medium opacity-80 mt-0.5" lang="en">
                Named one · pass to {otherTeam.nameEn}
              </div>
            </button>
          </div>
          <p className="mt-3 font-en-body text-xs text-cream-45" lang="en">
            Host taps "Named one!" each time the player names something successfully. <ChevronsRight size={11} className="inline" /> The clock keeps running; turn passes after each name.
          </p>
        </>
      ) : (
        <div className="mt-6">
          <div className="font-ar-ui text-base text-gold-light font-semibold">
            {s.chokeTeamIdx !== null ? 'تم! اللعب توقف' : 'انتهى الوقت!'}
          </div>
          <div className="font-en-body text-sm text-cream-60 mt-0.5" lang="en">
            {s.chokeTeamIdx !== null ? 'Round ended on a choke' : 'Time\'s up!'}
          </div>
        </div>
      )}

      {/* Cell value reminder */}
      <p className="mt-4 font-en-body text-xs text-cream-45" lang="en">
        Stakes: {cellValue * 2} points to the winner
      </p>
    </motion.div>
  );
}

function TeamTurnChip({ team, isActive, count }) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors duration-150 ${
        isActive ? 'border-gold bg-gold/10' : 'border-gold-faint bg-ink-80 opacity-60'
      }`}
      style={isActive ? { boxShadow: 'var(--chip-active-shadow-soft)' } : undefined}
    >
      <span className="text-lg leading-none">{team.emoji}</span>
      <div className="text-start">
        <div className="font-ar-body font-bold text-cream text-sm leading-tight">{team.name}</div>
        <div className="font-en-body text-xs text-cream-45 leading-tight" lang="en">
          {team.nameEn}
        </div>
      </div>
      <div className="ms-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-ink-80 border border-gold-faint">
        <span className="font-en-display font-bold text-sm leading-none text-gold">{count}</span>
      </div>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />}
    </div>
  );
}
