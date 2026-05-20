import { motion } from 'framer-motion';
import { Trophy, X as XIcon } from 'lucide-react';

/* ─── RESULT STAGE · full-screen winner reveal ─────────────────────────
   Two big team cards side-by-side. Clicking a card awards that team.
   The other-team card gets a 👑 + glow when auto-winner (opponent choked).
   A smaller "No winner" button below allows host to deny the award. */

export default function ResultStage({ teams, counts, chokeTeamIdx, cellValue, onAward }) {
  const autoWinnerIdx = chokeTeamIdx !== null ? 1 - chokeTeamIdx : null;
  const award = cellValue * 2;

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col px-4 py-6 md:px-8 md:py-10"
    >
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          className="mb-2"
          style={{ filter: 'drop-shadow(0 0 22px rgba(212,162,76,0.7))' }}
        >
          <Trophy size={72} className="text-gold mx-auto" strokeWidth={1.5} />
        </motion.div>
        <h1
          className="font-ar-body font-bold text-3xl md:text-4xl text-gold"
          style={{ textShadow: 'var(--glow-text-gold-wide)' }}
        >
          {autoWinnerIdx !== null
            ? `${teams[autoWinnerIdx].name} يفوز!`
            : 'من يستحق الفوز؟'}
        </h1>
        <p className="font-en-display italic text-gold-light text-base md:text-lg mt-1" lang="en">
          {autoWinnerIdx !== null
            ? `${teams[autoWinnerIdx].nameEn} wins — opponent choked`
            : `Who wins the challenge? · ${award} pts on the line`}
        </p>
      </div>

      {/* Team cards */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 max-w-5xl mx-auto w-full items-stretch">
        {teams.map((team, idx) => (
          <TeamResultCard
            key={team.id}
            team={team}
            count={counts[idx]}
            choked={chokeTeamIdx === idx}
            isAutoWinner={autoWinnerIdx === idx}
            award={award}
            onClick={() => onAward(team.id)}
          />
        ))}
      </div>

      {/* No-winner option */}
      <div className="mt-6 md:mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => onAward(null)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gold-faint bg-ink-80 text-cream-60 hover:text-cream hover:border-cream-60 transition-colors duration-150"
        >
          <XIcon size={16} />
          <span className="font-ar-ui text-sm font-semibold">بلا منح</span>
          <span className="font-en-body text-xs opacity-70 uppercase tracking-wide" lang="en">
            · No winner
          </span>
        </button>
      </div>
    </motion.div>
  );
}

function TeamResultCard({ team, count, choked, isAutoWinner, award, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-3xl px-6 py-8 md:px-8 md:py-10 text-center border-[3px] flex flex-col items-center transition-all duration-200 hover:-translate-y-1"
      style={{
        borderColor: isAutoWinner ? 'var(--color-gold)' : `${team.color}99`,
        background: 'linear-gradient(160deg, rgba(0,0,0,0.4) 0%, rgba(14,14,15,0.92) 100%)',
        boxShadow: isAutoWinner
          ? '0 0 60px rgba(212,162,76,0.45), inset 0 0 30px rgba(212,162,76,0.08)'
          : '0 6px 20px rgba(0,0,0,0.3)',
      }}
    >
      {isAutoWinner && (
        <span
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl"
          style={{ filter: 'drop-shadow(0 0 12px rgba(212,162,76,0.6))' }}
          aria-hidden="true"
        >
          👑
        </span>
      )}

      <div
        className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-5xl md:text-6xl mb-4"
        style={{
          border: `4px solid ${team.color}`,
          background: 'rgba(0,0,0,0.45)',
          color: team.color,
        }}
        aria-hidden="true"
      >
        {team.emoji || team.name?.[0] || '⚔'}
      </div>

      <div className="font-ar-body font-bold text-cream text-2xl md:text-3xl leading-tight">
        {team.name}
      </div>
      <div className="font-en-body text-sm md:text-base text-cream-60 italic mb-4" lang="en">
        {team.nameEn}
      </div>

      <div
        className="font-en-display font-bold text-6xl md:text-7xl leading-none"
        style={{ color: team.color }}
      >
        {count}
      </div>
      <div className="font-en-body text-xs uppercase tracking-wider text-cream-45 mt-1" lang="en">
        named
      </div>

      {choked && (
        <div
          className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            background: 'rgba(196,65,80,0.18)',
            border: '1px solid var(--color-crimson)',
            color: 'var(--color-crimson)',
          }}
        >
          ✕ عجز · choked
        </div>
      )}

      <div
        className="mt-6 w-full max-w-xs px-4 py-3 rounded-xl btn-gold font-bold text-base md:text-lg flex flex-col items-center"
      >
        <span className="font-ar-ui">✓ امنح {team.name}</span>
        <span className="font-en-body text-xs opacity-80 italic mt-0.5" lang="en">
          Award {award} pts to {team.nameEn}
        </span>
      </div>
    </button>
  );
}
