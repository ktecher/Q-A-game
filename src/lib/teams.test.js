import { describe, it, expect } from 'vitest';
import { inkOn } from './teams';
import { TEAM_COLORS } from '../screens/SetupScreen/constants';

const lum = (hex) => {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The table has no browser test and the failure is invisible with the default
// blue/red pair, so this is the only thing standing between a host picking
// gold or green and an unreadable name on the active player's card.
describe('inkOn', () => {
  it('clears the 3:1 large-text bar on every selectable team colour', () => {
    for (const color of TEAM_COLORS) {
      expect(contrast(inkOn(color), color)).toBeGreaterThanOrEqual(3);
    }
  });

  it('beats the fixed alternative it was introduced to replace', () => {
    // Neither literal survives all six on its own — that is the whole reason
    // this helper exists, so assert the failure it fixes is real.
    expect(TEAM_COLORS.some((c) => contrast('#F4ECD8', c) < 3)).toBe(true);
    expect(TEAM_COLORS.some((c) => contrast('#1D1F20', c) < 3)).toBe(true);
  });
});
