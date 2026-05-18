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

  const continueAsGuest = (profile = { name: 'ضيف', emoji: '🎲' }) => {
    const full = { ...profile, deviceId: getDeviceId() };
    localStorage.setItem(STORAGE_KEYS.GUEST_PROFILE, JSON.stringify(full));
    setGuestProfile(full);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEYS.GUEST_PROFILE);
    setGuestProfile(null);
  };

  const value = {
    session,
    user: session?.user ?? null,
    guestProfile,
    isAuthenticated: !!session?.user,
    isGuest: !session && !!guestProfile,
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
