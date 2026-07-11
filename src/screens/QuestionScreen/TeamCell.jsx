import TeamIdentity from '../../components/TeamIdentity';

// Rail team card for the split-stage question screen. Shows the team's name +
// running score. Whose turn it is is conveyed purely by the active highlight
// (gold border + glow) — no status text needed, since only one card lights up.
//
// status: 'answering' | 'waiting' | 'done'
export default function TeamCell({ team, status }) {
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

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-lg border transition-all"
      style={{
        background: bg,
        borderColor: border,
        opacity: isWaiting ? 0.55 : 1,
        boxShadow: isAnswering ? 'var(--chip-active-shadow)' : 'none',
      }}
    >
      <TeamIdentity team={team} size="sm" truncate />
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-en-display font-bold text-xl leading-none"
          style={{ color: isAnswering ? 'var(--color-gold)' : team.color }}
        >
          {team.score}
        </span>
        <span className="font-ar-ui text-[10px] text-cream-45">نقطة</span>
      </div>
    </div>
  );
}
