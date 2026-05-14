export function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.max(0, r)).padStart(2, '0')}`;
}
