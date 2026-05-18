// Single source for the two default teams (names, colors, emojis). Three
// surfaces previously hand-coded the same Team Alpha (#3A7BC8, 🦅) and Team
// Beta (#9B2D3A, 🌙) values: the game reducer's initial state, the Setup
// screen's editable defaults, and the Results screen's demo data. Drifting
// any one of them by mistake produced inconsistent branding.
const TEAM_DEFAULTS = [
  { nameAr: 'الفريق الأول', nameEn: 'Team Alpha', color: '#3A7BC8', emoji: '🦅' },
  { nameAr: 'الفريق الثاني', nameEn: 'Team Beta',  color: '#9B2D3A', emoji: '🌙' },
];

// Initial team shape used by the gameReducer (with id, score, players).
export function makeReducerTeams() {
  return TEAM_DEFAULTS.map((d, i) => ({
    id: i + 1,
    name: d.nameAr,
    nameEn: d.nameEn,
    color: d.color,
    emoji: d.emoji,
    score: 0,
    players: [],
  }));
}

// Setup screen shape — adds defaultNameAr/defaultNameEn for placeholder text
// in the team-name inputs.
export function makeSetupTeams() {
  return TEAM_DEFAULTS.map((d) => ({
    name: d.nameAr,
    defaultNameAr: d.nameAr,
    defaultNameEn: d.nameEn,
    color: d.color,
    emoji: d.emoji,
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
    emoji: d.emoji,
    score: scores[i] ?? 0,
  }));
}
