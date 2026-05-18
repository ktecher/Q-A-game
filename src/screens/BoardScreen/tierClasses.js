// Maps a difficulty value (200/400/600) to its visual tokens for the board
// cell. Lives next to BoardCell because nothing else needs it.
export function tierClasses(value) {
  if (value === 200) {
    return {
      bg: 'var(--tier-easy-bg)',
      ring: 'var(--tier-easy-ring)',
      hoverShadow: 'var(--tier-easy-hover)',
      textColor: 'var(--tier-easy-text)',
      textShadow: 'var(--tier-easy-text-shadow)',
      size: 20,
    };
  }
  if (value === 400) {
    return {
      bg: 'var(--tier-mid-bg)',
      ring: 'var(--tier-mid-ring)',
      hoverShadow: 'var(--tier-mid-hover)',
      textColor: 'var(--tier-mid-text)',
      textShadow: 'var(--tier-mid-text-shadow)',
      size: 24,
    };
  }
  // 600 — deepest, with crimson accent
  return {
    bg: 'var(--tier-hard-bg)',
    ring: 'var(--tier-hard-ring)',
    hoverShadow: 'var(--tier-hard-hover)',
    textColor: 'var(--tier-hard-text)',
    textShadow: 'var(--tier-hard-text-shadow)',
    size: 28,
    showSparkle: true,
  };
}
