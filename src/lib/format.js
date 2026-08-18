export function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.max(0, r)).padStart(2, '0')}`;
}

// Cabinet high-score readout: four digits, zero-padded. A negative score (the
// host can dock points) keeps its sign and pads the magnitude.
export function formatScore(score) {
  const sign = score < 0 ? '-' : '';
  return sign + String(Math.abs(score)).padStart(4, '0');
}

// Arabic-Indic numerals — the results screen prints the winning margin in both
// scripts, the way the handoff sheet does ("MARGIN +400 · فارق ٤٠٠").
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function toArabicDigits(value) {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}
