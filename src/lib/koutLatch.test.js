import { describe, it, expect } from 'vitest';
import { latchedCard } from './koutLatch.js';

/* The optimistic latch. A tapped card is hidden from the hand before the
   server confirms it, and this decides when to stop hiding it. Both failure
   directions are silent in a browser, which is why they are pinned here:
   releasing too early flashes the card back onto the screen mid-play,
   releasing too late leaves it invisible AND untappable for the rest of the
   round. */
describe('latchedCard', () => {
  it('hides nothing when the player has not tapped', () => {
    expect(latchedCard(null, ['AS', 'KH'])).toBe(null);
  });

  it('keeps hiding the card while the server still lists it', () => {
    expect(latchedCard('AS', ['AS', 'KH'])).toBe('AS');
  });

  it('releases once the server hand no longer holds it', () => {
    expect(latchedCard('AS', ['KH'])).toBe(null);
  });

  // useKoutGame sets hand to null when the query returns no row, and the
  // server deletes every hand at game end — so the last card of a game
  // arrives here as null. Must not throw.
  it('survives a null hand', () => {
    expect(latchedCard('AS', null)).toBe(null);
    expect(latchedCard('AS', undefined)).toBe(null);
  });

  // The property that lets the caller skip a sequence guard: refetches can
  // land out of order, and a stale hand still CONTAINS the played card, so a
  // late response must only ever prolong the hiding.
  it('is monotone under an out-of-order refetch', () => {
    const fresh = latchedCard('AS', ['KH']);        // authoritative: gone
    const stale = latchedCard('AS', ['AS', 'KH']);  // older response arrives late
    expect(fresh).toBe(null);
    expect(stale).toBe('AS');   // still hidden — never flashes back
  });
});
