// Auth for the /dashboard admin area. Uses the isolated `supabaseAdmin`
// client, so signing in here NEVER touches the game's auth state.
//
// `isAdmin` is the real, RLS-backed check: it calls the `is_admin()` SQL
// function, which is true only for a user registered in `app_admins`. Even
// if a client tampered with `isAdmin`, every write is still gated by RLS.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';
import { ADMIN_USERNAME, ADMIN_EMAIL } from './constants';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // `booted` flips true the first time we reach a definitive verdict (either
  // no session, or the is_admin check finished). `loading` is derived from
  // it, so a later token refresh never bounces the dashboard to a spinner.
  const [booted, setBooted] = useState(false);

  // Track the session ONLY. This callback stays synchronous — it must never
  // await a Supabase call. On refresh, Supabase recovers the stored session
  // while holding its internal auth lock and fires this callback inside that
  // lock; awaiting another Supabase call here would re-enter the lock and
  // deadlock (the dashboard would hang forever on the spinner).
  useEffect(() => {
    let active = true;

    supabaseAdmin.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session ?? null;
      setSession(s);
      // No session → the verdict is already final (show the login form).
      if (!s) {
        setIsAdmin(false);
        setBooted(true);
      }
    });

    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      const s = next ?? null;
      setSession(s);
      if (!s) {
        setIsAdmin(false);
        setBooted(true);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // The is_admin check runs in its own effect — OUTSIDE the auth lock —
  // reacting to session changes. It re-runs on token refresh to keep
  // `isAdmin` current, but never flips `loading` back on.
  useEffect(() => {
    if (!session) return undefined;
    let active = true;

    supabaseAdmin.rpc('is_admin').then(({ data, error }) => {
      if (!active) return;
      setIsAdmin(!error && data === true);
      setBooted(true);
    });

    return () => {
      active = false;
    };
  }, [session]);

  const signIn = useCallback(async (username, password) => {
    if (String(username).trim().toLowerCase() !== ADMIN_USERNAME) {
      return { error: 'Incorrect username or password.' };
    }
    const { error } = await supabaseAdmin.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });
    if (error) return { error: 'Incorrect username or password.' };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabaseAdmin.auth.signOut();
  }, []);

  const loading = !booted;

  return (
    <AdminAuthContext.Provider value={{ session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
