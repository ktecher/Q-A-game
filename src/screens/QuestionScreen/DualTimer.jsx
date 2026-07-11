import { motion } from 'framer-motion';
import { formatTime } from '../../lib/format';

// Circular countdown for the split-stage rail. The ring drains as time runs
// out; the opposing team's secondary time sits underneath as a quiet caption.
// Replaces the old heavy dual-panel block — same information, a fraction of the
// visual weight.
export default function DualTimer({ timeLeft, max, secondary, opposingTeamNameEn }) {
  const urgent = timeLeft <= 5 && timeLeft > 0;
  const pct = max > 0 ? Math.max(0, Math.min(100, (timeLeft / max) * 100)) : 0;
  const ringColor = urgent ? 'var(--color-crimson, #C44150)' : 'var(--color-gold)';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-full grid place-items-center"
        style={{
          width: 78,
          height: 78,
          background: `conic-gradient(${ringColor} ${pct}%, var(--color-gold-faint) 0)`,
        }}
        role="timer"
        aria-label={`${formatTime(timeLeft)} remaining`}
      >
        <div
          className="rounded-full grid place-items-center"
          style={{
            width: 62,
            height: 62,
            background: 'var(--color-ink)',
            boxShadow: 'inset 0 0 0 1px var(--color-gold-faint)',
          }}
        >
          <motion.span
            key={Math.floor(timeLeft)}
            initial={urgent ? { scale: 1.15 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-en-display font-bold leading-none tabular-nums"
            style={{
              fontSize: 24,
              color: ringColor,
              textShadow: urgent ? 'var(--glow-text-crimson)' : 'var(--glow-text-gold)',
            }}
          >
            {formatTime(timeLeft)}
          </motion.span>
        </div>
      </div>
      <div className="font-ar-ui text-[11px] text-cream-45 text-center leading-tight">
        <span lang="en" dir="ltr">{opposingTeamNameEn}</span> ▸ {formatTime(secondary)}
      </div>
    </div>
  );
}
