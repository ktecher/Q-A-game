import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import AwardButtons from '../AwardButtons';

/* ─── PHASE-3 RESULT · host picks winner (or auto-pick on choke) ─────── */

export default function ResultDialog({ teams, counts, chokeTeamIdx, cellValue, onAward }) {
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
      <div className="mt-5">
        <AwardButtons teams={teams} value={award} onAward={onAward} variant="compact" />
      </div>
    </motion.div>
  );
}
