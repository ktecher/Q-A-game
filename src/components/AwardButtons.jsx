import { X as XIcon } from 'lucide-react';

// 3-column "Team A · No Award · Team B" award row. Used by both QuestionScreen
// (normal question award, value = cellValue) and ChallengeRound's ResultDialog
// (challenge award, value = cellValue * 2). Same layout, just different size
// tokens; the `variant` prop swaps between "full" (roomy, used on the main
// question screen) and "compact" (denser, used inside the challenge modal).
//
// onAward(teamId | null) — pass a team id to award that team, or null for
// "no award" (cell played, no points).

const VARIANTS = {
  full: {
    gap: 'gap-2.5',
    btnPad: 'px-4 py-4',
    btnGap: 'gap-1.5',
    noAwardPad: 'px-4 py-4',
    noAwardMinW: 'min-w-[90px]',
    emoji: 'text-2xl',
    name: 'text-sm',
    nameEn: 'text-sm',
    delta: 'text-lg',
    showLabelRow: true,  // shows "منح {name}" + "Award · {nameEn}"
  },
  compact: {
    gap: 'gap-2',
    btnPad: 'px-3 py-3',
    btnGap: 'gap-0.5',
    noAwardPad: 'px-3 py-3',
    noAwardMinW: '',
    emoji: 'text-xl',
    name: 'text-xs',
    nameEn: 'text-[11px]',
    delta: 'text-base',
    showLabelRow: false, // shows only "منح {name}" + "+{value}"
  },
};

export default function AwardButtons({ teams, value, onAward, variant = 'full' }) {
  const v = VARIANTS[variant] ?? VARIANTS.full;
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] ${v.gap}`}>
      <TeamAwardButton team={teams[0]} value={value} onAward={onAward} variant={variant} />
      <button
        type="button"
        onClick={() => onAward(null)}
        className={`flex flex-col items-center justify-center gap-1 ${v.noAwardPad} rounded-lg border bg-ink-80 border-gold-faint text-cream-60 hover:border-cream-60 hover:text-cream transition ${v.noAwardMinW}`}
      >
        <XIcon size={variant === 'full' ? 18 : 14} className="opacity-70" />
        <span className={`font-ar-ui ${v.name} font-semibold`}>بلا منح</span>
        <span
          className={`font-en-body ${v.nameEn} uppercase tracking-wide`}
          lang="en"
        >
          {variant === 'full' ? 'No Award' : 'No win'}
        </span>
      </button>
      <TeamAwardButton team={teams[1]} value={value} onAward={onAward} variant={variant} />
    </div>
  );
}

function TeamAwardButton({ team, value, onAward, variant }) {
  const v = VARIANTS[variant] ?? VARIANTS.full;
  return (
    <button
      type="button"
      onClick={() => onAward(team.id)}
      className={`flex flex-col items-center justify-center ${v.btnGap} ${v.btnPad} rounded-lg border-2 transition-all hover:-translate-y-0.5`}
      style={{
        background: 'var(--award-team-bg)',
        borderColor: `${team.color}b3`,
      }}
    >
      <span className={`${v.emoji} leading-none`}>{team.emoji}</span>
      <span className={`font-ar-ui ${v.name} font-bold text-cream`}>
        منح {team.name}
      </span>
      {v.showLabelRow && (
        <span
          className={`font-en-body ${v.nameEn} text-cream-60 uppercase tracking-wide`}
          lang="en"
        >
          Award · {team.nameEn}
        </span>
      )}
      <span
        className={`font-en-display font-bold ${v.delta} ${v.showLabelRow ? 'mt-0.5' : ''}`}
        style={{ color: team.color }}
      >
        +{value}
      </span>
    </button>
  );
}
