/* The optimistic-play latch for a player's hand.

   HandStrip hides a tapped card before the server has confirmed it, so the
   card leaves the hand on tap instead of a second later. This decides when to
   stop hiding it. Its own module because the lint rule keeps component files
   exporting only components — and because the failure it guards is silent in
   a browser and deserves a test.
*/

/* Which tapped card is still worth hiding. The silent failure: a latch that
   never releases leaves the card filtered out of the render, so there is
   nothing left to tap and it is gone for the rest of the round.

   `hand ?? []` is load-bearing rather than defensive. useKoutGame sets hand to
   null whenever the query returns no row, and index.ts deletes every hand when
   the game ends, so the last card of a game reaches this with hand === null.

   Monotone under reordering, which is why the caller needs no sequence guard:
   a STALE hand still contains the played card, so a late refetch can only
   prolong the hiding, never end it early. */
export function latchedCard(tapped, hand) {
  if (tapped === null) return null;
  return (hand ?? []).includes(tapped) ? tapped : null;
}
