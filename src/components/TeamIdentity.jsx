// Visual identity for a team: emoji + Arabic name + English name. Three
// surfaces (BoardScreen's TeamChip, QuestionScreen's TeamCell, ChallengeRound's
// TeamTurnChip) previously hand-coded the same emoji-and-name block. Now they
// share this primitive — only the surrounding wrapper (status, score, button
// vs. div) varies per surface.

const SIZE_TOKENS = {
  sm: { emoji: 'text-lg',  name: 'text-sm',   nameEn: 'text-xs' },
  md: { emoji: 'text-2xl', name: 'text-base', nameEn: 'text-xs' },
  lg: { emoji: 'text-2xl', name: 'text-base', nameEn: 'text-sm' },
};

export default function TeamIdentity({ team, size = 'md', truncate = false, suffixEn }) {
  const sz = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  const truncClass = truncate ? 'truncate' : '';
  return (
    <>
      <span className={`${sz.emoji} leading-none`}>{team.emoji}</span>
      <div className="min-w-0 text-start">
        <div className={`font-ar-body font-bold text-cream ${sz.name} leading-tight ${truncClass}`}>
          {team.name}
        </div>
        <div
          className={`font-en-body text-cream-45 ${sz.nameEn} leading-tight ${truncClass}`}
          lang="en"
        >
          {team.nameEn}
          {suffixEn}
        </div>
      </div>
    </>
  );
}
