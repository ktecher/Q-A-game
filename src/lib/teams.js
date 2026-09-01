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
