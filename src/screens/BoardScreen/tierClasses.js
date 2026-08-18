// Maps a difficulty value (200/400/600) to its arcade board-cell tokens.
// Lives next to BoardCell because nothing else needs it.
const TIERS = {
  200: {
    bg: 'var(--blue-p)',
    border: 'var(--blue)',
    ink: 'var(--blue-ink)',
    shadow: 'var(--shadow)',
    stud: 'rgba(244, 236, 216, 0.25)',
    size: 34,
  },
  400: {
    bg: 'var(--panel3)',
    border: 'var(--gold)',
    ink: 'var(--gold-ink)',
    shadow: 'var(--gold-sh)',
    stud: 'rgba(255, 211, 78, 0.5)',
    size: 40,
  },
  600: {
    bg: 'var(--red-p)',
    border: 'var(--red)',
    ink: 'var(--red-ink)',
    shadow: 'var(--red-d)',
    stud: 'rgba(255, 138, 150, 0.5)',
    size: 44,
  },
};

export function tierClasses(value) {
  return TIERS[value] ?? TIERS[600];
}

// Board legend, matching the reference sheet. The bonus row is listed so the
// key is complete, but no cell is ever *drawn* in the bonus style: challenge
// cells are a surprise revealed on pick, and colouring them on the grid would
// tell both teams exactly which blocks are duels.
export const TIER_LEGEND = [
  { label: '200 EASY', bg: 'var(--blue-p)', border: 'var(--blue)' },
  { label: '400 MID', bg: 'var(--panel3)', border: 'var(--gold)' },
  { label: '600 HARD', bg: 'var(--red-p)', border: 'var(--red)' },
  { label: '? BONUS DUEL', bg: 'var(--purple-p)', border: 'var(--purple)' },
  { label: 'CLEARED', bg: 'var(--cleared-bg)', border: 'var(--line)' },
];
