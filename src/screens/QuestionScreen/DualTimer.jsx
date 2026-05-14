import { motion } from 'framer-motion';
import { formatTime } from '../../lib/format';

export default function DualTimer({ primary, secondary, opposingTeamNameEn }) {
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
