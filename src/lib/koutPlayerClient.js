import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* A SECOND Supabase client, for Kout players only.
 *
 * Why it exists: a phone that scans the join QR is very often already signed
 * into a real account in this app (the owner's, on a borrowed phone, or the
 * host's own). The default client shares one auth storage key per origin, so
 * `getSession()` on two such phones returns the SAME account — one identity
 * across two devices. `kout_seats`' one-seat-per-user index then correctly
 * refuses the second player a seat, and the game is unjoinable.
 *
 * The distinct `storageKey` is the entire fix: this client keeps its own
 * anonymous session, so two phones on the same account still get two
 * different player uids, and becoming a Kout player never signs anyone out
 * of their real account in that browser.
 *
 * Config mirrors ./supabase deliberately (same env vars, same placeholder
 * fallbacks so createClient cannot throw on a misconfigured build, same
 * realtime cap). ./supabase is loaded app-wide by AuthContext and already
 * logs the missing-config warnings — no need to say it twice.
 */
export const koutPlayerSupabase = createClient(
  url ?? 'http://placeholder.local',
  anonKey ?? 'placeholder',
  {
    auth: { storageKey: 'uah.kout_player', persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 30 } },
  }
);
