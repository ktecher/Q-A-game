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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function resolve(nextSession) {
      if (!active) return;
      setLoading(true);
      setSession(nextSession ?? null);
      let admin = false;
      if (nextSession) {
        const { data, error } = await supabaseAdmin.rpc('is_admin');
        admin = !error && data === true;
      }
      if (!active) return;
      setIsAdmin(admin);
      setLoading(false);
    }

    supabaseAdmin.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_event, s) =>
      resolve(s)
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
