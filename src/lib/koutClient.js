import { supabase } from './supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import { koutPlayerSupabase } from './koutPlayerClient';

/* Two identities, two clients — do NOT collapse these back into one.
 *
 *   HOST   — reached /kout and /kout/table from inside the app, signed in as
 *            a real account. `create` writes that uid to kout_games.host_id,
 *            and is_kout_member() grants the host its reads on that basis.
 *            Must stay on the main app client.
 *   PLAYER — arrived by scanning the QR. Uses the isolated player client so
 *            two phones already signed into the same account still get two
 *            different uids (see koutPlayerClient.js). Every seat-bound
 *            action and every seat-bound read must go through it.
 *
 * The Edge Function derives `uid` from the Authorization header, i.e. from
 * whichever client invoked it — so the client choice below *is* the identity.
 */

/* Every Kout mutation goes through the `kout` Edge Function — clients have
   read-only grants on the game tables by design (see 0010_kout.sql). */
/* Pin every invocation to the database's own region.
 *
 * Supabase geo-routes an Edge Function to whichever region is nearest the
 * CALLER, and this project's Postgres is in ap-southeast-1. Production logs
 * showed the same game served from Zurich, Mumbai and Marseille — so one
 * `play`, which makes 7 sequential calls to Auth and PostgREST, was paying a
 * cross-continent round trip on every one of them: ~230 ms each, a measured
 * p50 of 1038 ms, and traced plays as slow as 2.5 s.
 *
 * Pinning moves the function next to the data it spends its whole life
 * talking to, so those 7 hops become in-region. It makes the caller's own
 * round trip slightly worse — everyone now reaches Singapore rather than the
 * nearest edge — and that is the trade: roughly 150 ms spent to save 1600.
 *
 * Must match the project's region exactly. If the database ever moves, this
 * moves with it, or the fix silently becomes the bug it was written for.
 *
 * Note this makes supabase-js send an `x-region` header, which makes the
 * browser preflight ask for it — index.ts's access-control-allow-headers
 * must list it. Deploy the function BEFORE shipping this.
 */
const KOUT_REGION = FunctionRegion.ApSoutheast1;

/* Which ensure*Session belongs to a given client. Identity is chosen by the
   client (see the note at the top of this file), so the way to restore a
   session is chosen the same way. */
const ensureSessionFor = (client) =>
  (client === koutPlayerSupabase ? ensurePlayerSession : ensureHostSession)();

async function call(client, action, args = {}) {
  /* Establish the session BEFORE invoking, every time.
   *
   * With no session, supabase-js sends the publishable key as the bearer
   * token. That used to be survivable because anon keys were themselves
   * JWTs; the `sb_publishable_...` keys are opaque strings, so GoTrue
   * rejects them outright — observed in production as
   *
   *   403 bad_jwt "token is malformed: token contains an invalid number of
   *   segments"
   *
   * which this function reports as 'not signed in'. It arrived twelve times
   * in twenty-four seconds, once per tick of SeatScreen's 2s peekGame poll,
   * because nothing re-established the session once it was gone.
   *
   * getSession() inside the helpers refreshes an expired access token
   * locally and only reaches the network when it must, so the common case
   * costs nothing. For a player it also PRESERVES the uid whenever the
   * refresh token is still good — which matters more than the latency:
   * a fresh anonymous sign-in would mint a new uid and strand them outside
   * their own seat. */
  await ensureSessionFor(client);

  const { data, error } = await client.functions.invoke('kout', {
    body: { action, ...args },
    region: KOUT_REGION,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'kout: unknown error');
  return data;
}

/* Both ensure*Session helpers rethrow Supabase's own AuthError untouched
   rather than repacking it as `new Error(error.message)`. The message alone
   is not enough to tell the layers apart: a disabled "anonymous sign-ins"
   project setting and a failing trigger on auth.users both surface here, and
   only `status` separates them (422 vs 500). Callers still read `.message`
   exactly as before, so this costs nothing and keeps the diagnosis. */

/* Host: whatever account is already signed in owns the game. Anonymous is
   only a fallback for a host who is signed into nothing at all. */
export async function ensureHostSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}

/* Player: never inherits the app's account session — that is exactly the bug
   this exists to prevent. Only ever this client's own anonymous session,
   which is per-browser-profile and therefore per-phone. */
export async function ensurePlayerSession() {
  const { data } = await koutPlayerSupabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await koutPlayerSupabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}

// ── Host actions ───────────────────────────────────────────────────
export const createGame = (seatCount, teamNames, teamColors) =>
  call(supabase, 'create', { seatCount, teamNames, teamColors });
export const startRound = (gameId) => call(supabase, 'startRound', { gameId });

// ── Player actions ─────────────────────────────────────────────────
export const claimSeat = (joinCode, seat, name) =>
  call(koutPlayerSupabase, 'claimSeat', { joinCode, seat, name });
export const peekGame = (joinCode) => call(koutPlayerSupabase, 'peekGame', { joinCode });
export const setReady = (gameId, ready) => call(koutPlayerSupabase, 'setReady', { gameId, ready });
export const placeBid = (gameId, bid) => call(koutPlayerSupabase, 'bid', { gameId, bid });
export const setHukm = (gameId, hukm) => call(koutPlayerSupabase, 'setHukm', { gameId, hukm });
export const playCard = (gameId, card) => call(koutPlayerSupabase, 'play', { gameId, card });
