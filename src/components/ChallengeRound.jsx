import { useState, useEffect, useReducer, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, X as XIcon, Check, AlertTriangle, Hourglass,
  ChevronsRight, Trophy, Hand, Play,
} from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const TOTAL_TIME = 30; // seconds for the whole round, alternating word-by-word

/* ─── PHASE-1 DIALOG · Accept or Decline ─────────────────────────────── */

function AcceptDialog({ cellValue, teamName, onAccept, onDecline }) {
  return (
    <motion.div
      key="accept"
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="surface px-7 py-8 max-w-md w-full text-center relative overflow-hidden"
      style={{
        background: 'var(--card-gold-soft-grad)',
        border: '2px solid var(--color-gold)',
        boxShadow: 'var(--card-gold-soft-shadow)',
      }}
    >
      {/* Sparkle burst decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden="true">
        <span className="absolute top-3 start-4 text-gold-light text-2xl">✦</span>
        <span className="absolute top-8 end-6 text-gold-light text-sm">◇</span>
        <span className="absolute bottom-6 start-8 text-cream text-lg">·</span>
        <span className="absolute bottom-12 end-4 text-gold text-2xl">✦</span>
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 border-2 border-gold mb-4"
        >
          <Zap size={32} className="text-gold" strokeWidth={2.5} />
        </motion.div>

        <h2 className="font-ar-body font-bold text-3xl text-gold drop-shadow"
            style={{ textShadow: 'var(--glow-text-gold-wide)' }}>
          جولة التحدي!
        </h2>
        <p className="font-en-display italic text-gold-light text-xl mt-1" lang="en">
          Challenge Round!
        </p>

        <div className="mt-5 px-3 py-2.5 rounded-lg bg-ink-80 border border-gold-faint">
          <p className="font-ar-ui text-base text-cream">
            صندوق سحري · {teamName} وقع على تحدٍ خاص
          </p>
          <p className="font-en-body text-sm text-cream-60 mt-0.5" lang="en">
            Mystery box · {teamName} landed on a challenge
          </p>
        </div>

        {/* Rules */}
        <div className="mt-5 text-start space-y-2 px-2">
          <RuleLine icon={<Sparkles size={14} />}
            ar="لاعب من كل فريق يتنافس وجهًا لوجه"
            en="One player from each team faces off" />
          <RuleLine icon={<Hourglass size={14} />}
            ar="٣٠ ثانية مشتركة، يتبادلان الإجابة كلمة بكلمة"
            en="30 seconds shared, alternating word-by-word" />
          <RuleLine icon={<AlertTriangle size={14} />}
            ar="من يعجز عن الإجابة في دوره يخسر"
            en="If you choke on your turn, you lose" />
          <RuleLine icon={<Trophy size={14} />}
            ar={`الفائز يحصل على ضعف النقاط (${cellValue * 2})`}
            en={`Winner takes 2× points (${cellValue * 2})`} />
        </div>

        {/* CTAs */}
        <div className="mt-7 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-3 rounded-xl border border-gold-faint bg-ink-80 text-cream-60 hover:text-cream hover:border-cream-60 transition-colors duration-150"
          >
            <div className="font-ar-ui text-base font-semibold">رفض</div>
            <div className="font-en-body text-xs opacity-70 mt-0.5" lang="en">
              Decline · play normally
            </div>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="btn-gold px-4 py-3 rounded-xl"
          >
            <div className="font-ar-ui text-base font-bold">قبول</div>
            <div className="font-en-body text-xs font-medium opacity-80 mt-0.5" lang="en">
              Accept · 2× points
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RuleLine({ icon, ar, en }) {
  return (
    <div className="flex items-start gap-2 text-cream-60">
      <span className="text-gold mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="font-ar-ui text-sm">{ar}</div>
        <div className="font-en-body text-xs opacity-70" lang="en">{en}</div>
      </div>
    </div>
  );
}

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

function NamingPhase({ prompt, teams, startingTeamIdx, cellValue, onEnd }) {
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

/* ─── PHASE-3 RESULT · host picks winner (or auto-pick on choke) ─────── */

function ResultDialog({ teams, counts, chokeTeamIdx, cellValue, onAward }) {
  // If someone choked, the OTHER team wins automatically.
  const autoWinnerIdx = chokeTeamIdx !== null ? 1 - chokeTeamIdx : null;
  const award = cellValue * 2;

  return (
    <motion.div
      key="result"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="surface px-6 py-7 max-w-md w-full text-center"
      style={{
        background: 'var(--card-gold-strong-grad)',
        border: '2px solid var(--color-gold)',
        boxShadow: 'var(--card-gold-strong-shadow)',
      }}
    >
      <Trophy size={36} className="text-gold mx-auto mb-2" />
      <h3 className="font-ar-body font-bold text-2xl text-cream">من يستحق الفوز؟</h3>
      <p className="font-en-display italic text-cream-60 text-base" lang="en">
        Who wins the challenge?
      </p>

      {/* Final counts */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {teams.map((team, idx) => (
          <div
            key={team.id}
            className="px-3 py-3 rounded-lg border-2"
            style={{
              borderColor: autoWinnerIdx === idx ? 'var(--color-gold)' : `${team.color}66`,
              background: autoWinnerIdx === idx ? 'rgba(212,162,76,0.12)' : 'var(--award-team-bg)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl leading-none">{team.emoji}</span>
              <div className="text-start">
                <div className="font-ar-body font-bold text-cream text-base leading-tight">{team.name}</div>
                <div className="font-en-body text-xs text-cream-45" lang="en">{team.nameEn}</div>
              </div>
            </div>
            <div className="mt-2 font-en-display font-bold text-3xl" style={{ color: team.color }}>
              {counts[idx]}
            </div>
            <div className="font-en-body text-xs text-cream-45" lang="en">named</div>
            {chokeTeamIdx === idx && (
              <div className="mt-1 font-ar-ui text-xs text-crimson">عجز · choked</div>
            )}
          </div>
        ))}
      </div>

      {chokeTeamIdx !== null && (
        <p className="mt-4 font-ar-ui text-base text-gold-light">
          {teams[autoWinnerIdx].name} يفوز تلقائيًا!
          <span className="block font-en-body text-sm text-cream-60 mt-0.5" lang="en">
            {teams[autoWinnerIdx].nameEn} wins automatically (other team choked)
          </span>
        </p>
      )}

      {/* Award buttons */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-2">
        <button
          type="button"
          onClick={() => onAward(teams[0].id)}
          className="flex flex-col items-center gap-0.5 px-3 py-3 rounded-lg border-2 transition-colors duration-150 hover:-translate-y-0.5"
          style={{
            background: 'var(--award-team-bg)',
            borderColor: `${teams[0].color}b3`,
          }}
        >
          <span className="text-xl leading-none">{teams[0].emoji}</span>
          <span className="font-ar-ui text-xs font-bold text-cream">منح {teams[0].name}</span>
          <span className="font-en-display font-bold text-base" style={{ color: teams[0].color }}>
            +{award}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAward(null)}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-lg border bg-ink-80 border-gold-faint text-cream-60 hover:text-cream transition-colors duration-150"
        >
          <XIcon size={14} />
          <span className="font-ar-ui text-xs font-semibold">بلا منح</span>
          <span className="font-en-body text-[11px]" lang="en">No win</span>
        </button>
        <button
          type="button"
          onClick={() => onAward(teams[1].id)}
          className="flex flex-col items-center gap-0.5 px-3 py-3 rounded-lg border-2 transition-colors duration-150 hover:-translate-y-0.5"
          style={{
            background: 'var(--award-team-bg)',
            borderColor: `${teams[1].color}b3`,
          }}
        >
          <span className="text-xl leading-none">{teams[1].emoji}</span>
          <span className="font-ar-ui text-xs font-bold text-cream">منح {teams[1].name}</span>
          <span className="font-en-display font-bold text-base" style={{ color: teams[1].color }}>
            +{award}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

/* ─── ROOT · orchestrates the three phases ───────────────────────────── */

// The inner component is keyed on the challenge cell so a new challenge
// remounts it with fresh phase/state — no setState-in-effect needed.
function ChallengeInner() {
  const { state, awardChallenge, cancelChallenge } = useGame();
  const { currentChallenge, teams, activeTeamIdx } = state;
  const [phase, setPhase] = useState('accept'); // 'accept' | 'naming' | 'result'
  const [namingResult, setNamingResult] = useState(null);

  if (!currentChallenge) return null;

  const cellValue = currentChallenge.value;
  const activeTeam = teams[activeTeamIdx];

  const handleAccept = () => setPhase('naming');
  const handleDecline = () => cancelChallenge();
  const handleNamingEnd = (result) => {
    setNamingResult(result);
    setPhase('result');
  };
  const handleAward = (teamId) => awardChallenge(teamId);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <AnimatePresence mode="wait">
        {phase === 'accept' && (
          <AcceptDialog
            key="accept-phase"
            cellValue={cellValue}
            teamName={activeTeam.name}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
        {phase === 'naming' && (
          <NamingPhase
            key="naming-phase"
            prompt={currentChallenge.prompt}
            teams={teams}
            startingTeamIdx={activeTeamIdx}
            cellValue={cellValue}
            onEnd={handleNamingEnd}
          />
        )}
        {phase === 'result' && namingResult && (
          <ResultDialog
            key="result-phase"
            teams={teams}
            counts={namingResult.counts}
            chokeTeamIdx={namingResult.chokeTeamIdx}
            cellValue={cellValue}
            onAward={handleAward}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChallengeRound() {
  const { state } = useGame();
  const ch = state.currentChallenge;
  if (!ch) return null;
  // Key on the cell triple — when a NEW challenge starts, force a remount
  // so phase resets to 'accept' without needing a setState-in-effect.
  const cellKey = `${ch.categorySlug}|${ch.value}|${ch.rowIdx}`;
  return <ChallengeInner key={cellKey} />;
}
