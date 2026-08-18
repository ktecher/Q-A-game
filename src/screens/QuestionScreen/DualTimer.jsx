import { formatTime } from '../../lib/format';

// A 12-segment HUD meter replaces the old conic-gradient ring — the arcade
// theme has no circles, and a segmented bar reads at TV distance.
const SEGMENTS = 12;

export default function DualTimer({ timeLeft, max, secondary, opposingLabel }) {
  const urgent = timeLeft <= 5 && timeLeft > 0;
  const ratio = max > 0 ? Math.max(0, Math.min(1, timeLeft / max)) : 0;
  const filled = Math.ceil(ratio * SEGMENTS);
  // Remaining segments burn gold, and drop to the darker gold once the clock is
  // in the last five seconds; spent segments fall back to the empty-meter line.
  const litColor = urgent ? 'var(--gold-sh)' : 'var(--gold)';

  return (
    <div
      className="text-center"
      style={{
        background: 'var(--panel)',
        border: '4px solid var(--gold)',
        boxShadow: '0 6px 0 var(--shadow)',
        padding: 14,
      }}
    >
      <div
        className="font-en-body leading-none"
        style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em' }}
        lang="en"
      >
        TIME LEFT
      </div>
      <div
        className={`font-ar-body font-extrabold leading-none tabular-nums ${urgent ? 'animate-flash' : ''}`}
        style={{
          fontSize: 76,
          color: urgent ? 'var(--red-ink)' : 'var(--gold-ink)',
          textShadow: urgent ? '4px 4px 0 var(--red-d)' : '4px 4px 0 var(--gold-sh)',
        }}
        dir="ltr"
        role="timer"
        aria-label={`${formatTime(timeLeft)} remaining`}
      >
        {formatTime(timeLeft)}
      </div>
      <div className="flex" style={{ gap: 3, marginTop: 10 }}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="flex-1"
            style={{ height: 18, background: i < filled ? litColor : 'var(--line)' }}
          />
        ))}
      </div>
      <div
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: 'var(--muted)', marginTop: 10 }}
        lang="en"
      >
        {opposingLabel} NEXT ▸ {formatTime(secondary)}
      </div>
    </div>
  );
}
