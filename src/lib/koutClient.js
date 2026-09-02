import { supabase } from './supabase';
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
async function call(client, action, args = {}) {
  const { data, error } = await client.functions.invoke('kout', {
    body: { action, ...args },
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
