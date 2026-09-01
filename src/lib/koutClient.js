import { supabase } from './supabase';

/* Every Kout mutation goes through the `kout` Edge Function — clients have
   read-only grants on the game tables by design (see 0010_kout.sql). */
async function call(action, args = {}) {
  const { data, error } = await supabase.functions.invoke('kout', {
    body: { action, ...args },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'kout: unknown error');
  return data;
}

/* Players arrive by QR with no account. An anonymous session is enough for
   RLS to identify a seat, and they never see a login screen. */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  return anon.session;
}

export const createGame = (seatCount, teamNames) => call('create', { seatCount, teamNames });
export const claimSeat = (joinCode, seat, name) => call('claimSeat', { joinCode, seat, name });
export const peekGame = (joinCode) => call('peekGame', { joinCode });
export const startRound = (gameId) => call('startRound', { gameId });
export const placeBid = (gameId, bid) => call('bid', { gameId, bid });
export const setHukm = (gameId, hukm) => call('setHukm', { gameId, hukm });
export const playCard = (gameId, card) => call('play', { gameId, card });
