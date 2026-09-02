import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceId';
import { STORAGE_KEYS } from '../lib/storageKeys';

const AuthContext = createContext(null);

function readStoredGuestProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GUEST_PROFILE);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Lazy initializer — runs once, syncs from localStorage without an effect
  const [guestProfile, setGuestProfile] = useState(readStoredGuestProfile);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = (profile = { name: 'ضيف' }) => {
    const full = { ...profile, deviceId: getDeviceId() };
    localStorage.setItem(STORAGE_KEYS.GUEST_PROFILE, JSON.stringify(full));
    setGuestProfile(full);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEYS.GUEST_PROFILE);
    setGuestProfile(null);
  };

  /* An ANONYMOUS session is not an account.
   *
   * Kout's host flow signs in anonymously when nobody is signed in
   * (koutClient.js ensureHostSession) so the game has a uid to own it — and
   * that session lands on this, the main app client. Counted as
   * `isAuthenticated`, it silently promoted a guest who merely opened /kout
   * into a signed-up user: SetupScreen switches on `isGuest` to choose
   * between the 6-stage guest preset and the full category picker, so the
   * whole paywall came off for the price of visiting an unguarded route.
   *
   * Supabase marks these sessions `user.is_anonymous`. Treating them as no
   * account at all keeps every downstream `isAuthenticated`/`isGuest` check
   * honest without any of them having to know Kout exists. Real accounts are
   * unaffected — `is_anonymous` is false for anyone who actually signed up.
   */
  const account = session?.user && !session.user.is_anonymous ? session.user : null;

  const value = {
    session,
    user: account,
    guestProfile,
    isAuthenticated: !!account,
    isGuest: !account && !!guestProfile,
    loading,
    continueAsGuest,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
