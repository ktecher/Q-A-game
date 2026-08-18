// One shared palette — both teams choose from all six. Nothing is reserved to
// a side, so P1 can take red and P2 can take blue.
//
// The two teams cannot share a colour: whichever one a team currently holds is
// greyed out and unclickable in the other team's row. It frees up the moment
// that team moves to a different colour, so the block is never permanent.
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
