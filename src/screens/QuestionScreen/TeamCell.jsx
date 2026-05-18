import { formatTime } from '../../lib/format';
import TeamIdentity from '../../components/TeamIdentity';

export default function TeamCell({ team, status, secondaryTimer, answeredText }) {
  // status: 'answering' | 'waiting' | 'done'
  const isAnswering = status === 'answering';
  const isWaiting = status === 'waiting';
  const isDone = status === 'done';

  const bg = isAnswering
    ? `linear-gradient(135deg, ${team.color}99, var(--color-ink-50))`
    : 'var(--color-ink-50)';

  const border = isAnswering
    ? 'var(--color-gold)'
    : isDone
      ? `${team.color}aa`
      : 'var(--color-gold-faint)';

  const opacity = isWaiting ? 0.55 : 1;

  return (
    <div
      className="flex flex-col gap-1.5 px-3.5 py-3 rounded-lg border transition-all"
      style={{
        background: bg,
        borderColor: border,
        opacity,
        boxShadow: isAnswering
          ? 'var(--chip-active-shadow)'
          : 'none',
      }}
    >
      <div className="flex items-center gap-2.5">
        <TeamIdentity
          team={team}
          size="lg"
          truncate
          suffixEn={answeredText ? ` · said: "${answeredText}"` : undefined}
        />
      </div>
      <div
        className="font-ar-ui text-xs flex items-center gap-1.5"
        style={{ color: isAnswering ? 'var(--color-gold-light)' : 'var(--color-cream-60)' }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isAnswering ? 'bg-gold animate-pulse-dot' : isDone ? 'bg-gold-light' : 'bg-cream-30'
            }`}
        />
        {isAnswering && (
          <>
            <span>يجيب الآن</span>
            <span className="opacity-70" lang="en">· Answering</span>
          </>
        )}
        {isWaiting && (
          <>
            <span>التالي · {formatTime(secondaryTimer)}</span>
            <span className="opacity-70" lang="en">· Up next</span>
          </>
        )}
        {isDone && (
          <>
            <span>أجاب</span>
            <span className="opacity-70" lang="en">· Done</span>
          </>
        )}
      </div>
    </div>
  );
}
