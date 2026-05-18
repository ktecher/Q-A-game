// Composite key for a board cell: identifies a (category, difficulty, row)
// triple as a string suitable for use in Sets/Maps. Lives in its own module
// so UI code (BoardScreen, ChallengeRound) can import it without pulling in
// the reducer file.
export function cellKey(slug, value, rowIdx) {
  return `${slug}|${value}|${rowIdx}`;
}
