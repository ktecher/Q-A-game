/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readSettings, writeSettings, ALLOWED_CHALLENGE_COUNTS } from './settingsStorage';
import { STORAGE_KEYS } from './storageKeys';

describe('settingsStorage — challengeCount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes the allowed challenge counts', () => {
    expect(ALLOWED_CHALLENGE_COUNTS).toEqual([2, 4]);
  });

  it('defaults challengeCount to 2 when nothing is stored', () => {
    expect(readSettings().challengeCount).toBe(2);
  });

  it('backfills challengeCount=2 for an older payload that predates the field', () => {
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify({ challengesEnabled: false })
    );
    const out = readSettings();
    expect(out.challengesEnabled).toBe(false);
    expect(out.challengeCount).toBe(2);
  });

  it('sanitizes a corrupt stored challengeCount back to the default', () => {
    for (const bad of [0, 1, 3, 5, 99, 'four', null]) {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ challengeCount: bad })
      );
      expect(readSettings().challengeCount).toBe(2);
    }
  });

  it('round-trips a valid challengeCount through writeSettings/readSettings', () => {
    writeSettings({ challengeCount: 4 });
    expect(readSettings().challengeCount).toBe(4);
    writeSettings({ challengeCount: 2 });
    expect(readSettings().challengeCount).toBe(2);
  });
});
