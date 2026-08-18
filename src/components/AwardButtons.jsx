// 3-column "Team A · No Award · Team B" award row for the stage-2 question
// screen. The old `compact` variant is gone — ChallengeScreen's ResultStage
// draws its own award row and never used it.
//
// onAward(teamId | null) — pass a team id to award that team, or null for
// "no award" (cell played, no points).

// P1 is always the blue side of the cabinet, P2 the red one.
const SIDES = [
  { bg: 'var(--blue-p)', border: 'var(--blue)', ink: 'var(--blue)', label: 'AWARD P1' },
  { bg: 'var(--red-p)', border: 'var(--red)', ink: 'var(--red)', label: 'AWARD P2' },
];

const v = { pad: 18, label: 10, name: 34, delta: 46, noAwardMinW: 150 };

export default function AwardButtons({ teams, value, onAward }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr]" style={{ gap: 14 }}>
      <TeamAwardButton team={teams[0]} side={SIDES[0]} value={value} onAward={onAward} />
      <button
        type="button"
        onClick={() => onAward(null)}
        className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
        style={{
          minWidth: v.noAwardMinW,
          padding: v.pad,
          background: 'var(--cleared-bg)',
          border: '4px solid var(--line)',
        }}
      >
        <div className="font-en-body leading-none" style={{ fontSize: 16, color: 'var(--muted2)' }}>
          <span aria-hidden="true">✕</span>
        </div>
        <div
          className="font-ar-body font-bold leading-none"
          style={{ fontSize: v.name - 4, color: 'var(--muted)', marginTop: 8 }}
        >
          بلا منح
        </div>
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}
          lang="en"
        >
          NO AWARD
        </div>
      </button>
      <TeamAwardButton team={teams[1]} side={SIDES[1]} value={value} onAward={onAward} />
    </div>
  );
}

function TeamAwardButton({ team, side, value, onAward }) {
  return (
    <button
      type="button"
      onClick={() => onAward(team.id)}
      className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
      style={{
        padding: v.pad,
        background: side.bg,
        border: `4px solid ${side.border}`,
        boxShadow: '0 8px 0 var(--shadow)',
      }}
    >
      <div
        className="font-en-body leading-none"
        style={{ fontSize: v.label, color: side.ink, letterSpacing: '0.1em' }}
        lang="en"
      >
        {side.label}
      </div>
      <div
        className="font-ar-body font-bold leading-none truncate"
        style={{ fontSize: v.name, color: 'var(--text)', marginTop: 8 }}
      >
        {team.name}
      </div>
      <div
        className="font-ar-body font-extrabold leading-none"
        style={{ fontSize: v.delta, color: side.ink, marginTop: 6 }}
        dir="ltr"
      >
        +{value}
      </div>
    </button>
  );
}
