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
  const [sessionResolved, setSessionResolved] = useState(false);
  // Last completed admin check, tagged with the user.id it was made for.
  // Keying by user.id (not the session ref) keeps the verdict valid across
  // a silent token refresh — same user, same verdict, no spinner blink —
  // while a real account change (sign-in / sign-out / different user) is
  // correctly treated as "verdict unknown" until the rpc reruns.
  const [verdict, setVerdict] = useState(null); // { userId, isAdmin } | null

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
      setSessionResolved(true);
      // Clear any stale verdict so a fresh sign-in always re-runs is_admin.
      if (!s) setVerdict(null);
    });

    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      const s = next ?? null;
      setSession(s);
      setSessionResolved(true);
      if (!s) setVerdict(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Run the is_admin check OUTSIDE the auth lock, reacting to session
  // changes. Skip while there is no session — the gate renders the login
  // form in that case and no verdict is needed.
  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    const userId = session.user?.id ?? null;

    supabaseAdmin.rpc('is_admin').then(({ data, error }) => {
      if (!active) return;
      setVerdict({ userId, isAdmin: !error && data === true });
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

  // Derived. The gate must NEVER see `isAdmin === false` for a session
  // whose check has not completed yet — otherwise a fresh sign-in is
  // bounced to /signin before the rpc can return (the regression we're
  // fixing here). So we stay in `loading` until the verdict's `userId`
  // matches the current session's user — that's the signal that the
  // verdict is for THIS user, not leftover from a previous session.
  const currentUserId = session?.user?.id ?? null;
  const verdictForCurrent =
    verdict && verdict.userId === currentUserId ? verdict.isAdmin : null;
  const loading =
    !sessionResolved || (!!session && verdictForCurrent === null);
  const isAdmin = verdictForCurrent === true;

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
