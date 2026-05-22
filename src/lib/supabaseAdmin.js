// Dedicated Supabase client for the /dashboard admin area.
//
// It uses a SEPARATE `storageKey` from the game's `supabase` client, so the
// admin's auth session is fully isolated: signing into the dashboard never
// changes the game's auth state, and vice-versa. Both clients talk to the
// same project with the same publishable key — writes are gated server-side
// by RLS (only a registered admin can mutate), never by this client.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseAdmin = createClient(
  url ?? 'http://placeholder.local',
  anonKey ?? 'placeholder',
  {
    auth: {
      storageKey: 'sb-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
