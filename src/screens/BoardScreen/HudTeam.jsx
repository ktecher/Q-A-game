import { formatScore } from '../../lib/format';

// Order matches the three 16×16 squares in the HUD, left to right.
const LIFELINE_KEYS = ['extraTime', 'hint', 'steal'];

/**
 * One team's block in the board HUD bar. Replaces the old rounded TeamChip:
 * a flush panel that fills with the team's tint while it's their turn.
 * Still clickable — that's how the host adjusts a score.
 */
export default function HudTeam({ team, index, isActive, lifelines, onAdjust }) {
  const isP1 = index === 0;
  const accent = isP1 ? 'var(--blue)' : 'var(--red)';

  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Click to adjust score"
      aria-label={`Adjust ${team.nameEn} score (currently ${team.score})`}
      className="flex-1 min-w-0 text-start"
      style={{
        padding: '14px 18px',
        background: isActive ? (isP1 ? 'var(--blue-p)' : 'var(--red-p)') : 'transparent',
        // Only P1 and the VS block carry a separator; P2 runs into the controls.
        borderInlineEnd: isP1 ? '4px solid var(--outline)' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="font-en-body leading-none"
          style={{ color: accent, fontSize: 11 }}
          lang="en"
        >
          {isP1 ? 'P1' : 'P2'}
        </span>
        <span
          className="font-ar-body font-bold leading-none truncate"
          style={{ color: 'var(--text)', fontSize: 30 }}
        >
          {team.name}
        </span>
        {isActive && (
          <span
            className="animate-blink shrink-0"
            style={{ width: 12, height: 12, background: 'var(--gold)' }}
            aria-label="Active team"
          />
        )}
      </div>

      <div
        className="font-ar-body font-extrabold leading-none tabular-nums"
        style={{ color: accent, fontSize: 52, textShadow: '4px 4px 0 var(--shadow)' }}
        dir="ltr"
      >
        {formatScore(team.score)}
      </div>

      <div className="flex items-center" style={{ gap: 5, marginTop: 6 }}>
        {LIFELINE_KEYS.map((key) => (
          <span
            key={key}
            style={{
              width: 16,
              height: 16,
              background: lifelines?.[key] ? 'var(--line)' : 'var(--gold)',
            }}
          />
        ))}
        <span
          className="font-en-body leading-none"
          style={{ color: 'var(--muted2)', fontSize: 9, marginInlineStart: 6 }}
          lang="en"
        >
          LIFELINES
        </span>
      </div>
    </button>
  );
}
