import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Volume2, LogOut } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

/**
 * Logged-in lobby. Minimal on purpose: greeting + a single Start Game CTA.
 * Anyone reaching here without a session (signed-out, never-signed-in) is
 * bounced to the marketing landing so this screen can stay un-conditional.
 *
 * Sits between sign-in and /setup so the user has a stable "home" to return
 * to from the exit dialog without re-encountering the auth screen.
 */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, guestProfile, isAuthenticated, isGuest, loading, signOut } = useAuth();

  // Wait for session rehydration before deciding — avoids a flash-redirect on refresh.
  if (loading) return null;
  if (!isAuthenticated && !isGuest) return <Navigate to="/" replace />;

  const displayName = user?.email?.split('@')[0] ?? guestProfile?.name ?? 'ضيف';
  const avatar = guestProfile?.emoji ?? '🎲';

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky top header — mirrors SetupScreen so the chrome is consistent ── */}
      <header className="sticky top-0 z-20 bg-ink/95 border-b border-gold-faint flex items-center justify-between px-4 py-3">
        <span className="font-ar-body font-bold text-gold-light text-lg tracking-wide">
          أم الهيمان ❖
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle size={16} />
          <button
            type="button"
            aria-label="Toggle sound"
            className="w-10 h-10 rounded-full surface flex items-center justify-center text-gold/80 hover:text-gold transition-colors duration-150"
          >
            <Volume2 size={16} />
          </button>
          <span className="flex items-center gap-2 bg-ink-80 border border-gold-faint rounded-full px-3 py-1">
            <span className="text-base leading-none">{avatar}</span>
            <span className="font-ar-ui text-sm text-cream truncate max-w-[120px]">
              {displayName}
            </span>
          </span>
        </div>
      </header>

      {/* ── Centered hero ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-ar-body font-bold text-3xl md:text-4xl text-cream">
            أهلاً، {displayName} 👋
          </h1>
          <p className="font-en-display italic text-cream-45 text-base mt-2" lang="en">
            Welcome back
          </p>
        </div>

        <div className="ornament-divider mt-8 mb-10" />

        <Link
          to="/setup"
          className="btn-gold px-10 py-5 rounded-2xl text-lg flex flex-col items-center gap-0.5 w-full max-w-sm"
        >
          <span>ابدأ اللعبة</span>
          <span className="font-en-body text-sm font-medium opacity-80" lang="en">
            Start Game →
          </span>
        </Link>
      </main>

      {/* ── Sign out + footer ─────────────────────────────────────── */}
      <footer className="text-center px-6 py-6 border-t border-gold-faint/40">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-cream-45 hover:text-crimson text-sm font-ar-ui transition inline-flex items-center gap-1.5"
        >
          <LogOut size={12} />
          <span>تسجيل الخروج</span>
          <span className="font-en-body" lang="en">· Sign out</span>
        </button>
        <p className="font-en-body text-cream-45 text-xs mt-3 tracking-wider" lang="en">
          v0.1 · Built with care for diwaniya nights
        </p>
      </footer>
    </div>
  );
}
