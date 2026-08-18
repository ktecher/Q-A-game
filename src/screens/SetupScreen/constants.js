// One shared palette — both teams choose from all six. Nothing is reserved to
// a side, so P1 can take red and P2 can take blue.
//
// A colour the other team already holds stays selectable rather than being
// disabled: swapping is a normal thing to do mid-setup, and greying it out
// would make the two rows disagree about what exists. TeamCard marks it
// instead, so picking a duplicate is a visible choice rather than an accident.
//
// The first two entries are the P1 / P2 defaults from lib/teams.js, so a
// freshly-opened Setup always has one swatch selected in each row.
export const TEAM_COLORS = [
  '#3A7BC8', // blue   — P1 default
  '#9B2D3A', // red    — P2 default
  '#4FB477', // green
  '#D4A24C', // gold
  '#8E6BC8', // purple
  '#E07A2F', // orange
];

export const DIFFICULTIES = [
  { value: 'easy',  ar: 'سهل',   en: 'Easy'  },
  { value: 'mixed', ar: 'متنوع', en: 'Mixed' },
  { value: 'hard',  ar: 'صعب',   en: 'Hard'  },
];
