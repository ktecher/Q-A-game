// Single source for the two default teams (names, colors). Three surfaces
// previously hand-coded the same Team Alpha (#3A7BC8) and Team Beta (#9B2D3A)
// values: the game reducer's initial state, the Setup screen's editable
// defaults, and the Results screen's demo data. Drifting any one of them by
// mistake produced inconsistent branding.
const TEAM_DEFAULTS = [
  { nameAr: 'الفريق الأول', nameEn: 'Team Alpha', color: '#3A7BC8' },
  { nameAr: 'الفريق الثاني', nameEn: 'Team Beta',  color: '#9B2D3A' },
];

// Kout screens render off a game row that may predate the team_colors column
// (or a peekGame response, which never carries it — see peekGame in
// supabase/functions/kout/index.ts). This is the one fallback every such
// screen falls back to, so the same two hex values can't drift out of step
// with each other the way the old per-screen TEAM_COLOR arrays did.
export const TEAM_COLOR_FALLBACK = TEAM_DEFAULTS.map((d) => d.color);

// Initial team shape used by the gameReducer (with id, score, players).
export function makeReducerTeams() {
  return TEAM_DEFAULTS.map((d, i) => ({
    id: i + 1,
    name: d.nameAr,
    nameEn: d.nameEn,
    color: d.color,
    score: 0,
    players: [],
  }));
}

// Setup screen shape — adds defaultNameAr/defaultNameEn for placeholder text
// in the team-name inputs.
export function makeSetupTeams() {
  return TEAM_DEFAULTS.map((d) => ({
    // Empty, not the default name: the Setup input shows defaultNameAr as a
    // placeholder so tapping the field gives you a clean box instead of text
    // you have to delete first. SetupScreen's startGame does
    // `t.name || t.defaultNameAr`, so leaving it blank still names the team.
    name: '',
    defaultNameAr: d.nameAr,
    defaultNameEn: d.nameEn,
    color: d.color,
    players: [],
  }));
}

// Demo data shown on ResultsScreen when a user direct-links to /play/results
// without having actually played a game.
export function makeDemoTeams(scores = [1800, 1400]) {
  return TEAM_DEFAULTS.map((d, i) => ({
    id: i + 1,
    name: d.nameAr,
    nameEn: d.nameEn,
    color: d.color,
    score: scores[i] ?? 0,
  }));
}

// Ink for text sitting ON a team colour — the Kout table floods the active
// player's card with it. The six selectable team colours are fixed hex
// literals (SetupScreen/constants.js), so the fill is theme-invariant while
// the box behind it is not, and neither fixed ink survives all six: cream
// fails on green (2.19:1), gold (1.97:1) and orange (2.55:1); dark ink fails
// on red (2.23:1), which is a default. Picking from the fill's own relative
// luminance makes the worst case 3.82:1 — clear of the 3:1 large-text bar.
//
// Returns the LITERAL hex, never var(--text): a theme-reactive token on a
// theme-invariant surface is the same trap TrickArea's card-face comment
// documents about var(--red).
export function inkOn(hex) {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  // sRGB relative luminance; 0.179 is where cream and ink contrast equally.
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.179 ? '#1D1F20' : '#F4ECD8';
}
