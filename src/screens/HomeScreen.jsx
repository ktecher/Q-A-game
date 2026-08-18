import { Link, Navigate, useNavigate } from 'react-router-dom';
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky top header — mirrors SetupScreen so the chrome is consistent ── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3"
        style={{
          padding: '14px 20px',
          background: 'var(--panel)',
          borderBottom: '4px solid var(--gold-d)',
        }}
      >
        <span
          className="font-ar-body font-extrabold leading-none"
          style={{ fontSize: 34, color: 'var(--gold-ink)' }}
        >
          أم الهيمان
        </span>
        <div className="flex items-center gap-3">
          <span
            className="font-en-body leading-none truncate uppercase max-w-[160px]"
            style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
            lang="en"
          >
            {displayName}
          </span>
          <ThemeToggle size={44} />
        </div>
      </header>

      {/* ── Centered hero ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 13, color: 'var(--blue)', letterSpacing: '0.24em', marginBottom: 14 }}
          lang="en"
        >
          ◄ PLAYER READY ►
        </div>

        <h1
          className="font-ar-body font-extrabold leading-none"
          style={{
            fontSize: 'clamp(38px, 6vw, 72px)',
            color: 'var(--gold-ink)',
            textShadow: '6px 6px 0 var(--gold-sh)',
          }}
        >
          أهلاً {displayName}
        </h1>
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 14, color: 'var(--text)', letterSpacing: '0.16em', marginTop: 14 }}
          lang="en"
        >
          WELCOME BACK
        </div>

        <div className="flex" style={{ gap: 6, marginTop: 22 }} aria-hidden="true">
          {['var(--gold-d)', 'var(--blue)', 'var(--red)', '#F4ECD8', 'var(--red)', 'var(--blue)', 'var(--gold-d)'].map(
            (color, i) => (
              <span key={i} style={{ width: 12, height: 12, background: color }} />
            )
          )}
        </div>

        <Link
          to="/setup"
          className="flex items-center gap-3 w-full transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
          style={{
            maxWidth: 420,
            marginTop: 34,
            padding: '14px 20px',
            background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
            border: '4px solid var(--outline)',
            boxShadow: '0 8px 0 var(--gold-sh), inset 4px 4px 0 rgba(255, 255, 255, 0.35)',
            color: 'var(--outline)',
          }}
        >
          <span className="font-en-body leading-none" style={{ fontSize: 12 }} aria-hidden="true">
            ▶
          </span>
          <span className="font-ar-body font-bold leading-none" style={{ fontSize: 32 }}>
            ابدأ اللعبة
          </span>
          <span
            className="font-en-body leading-none"
            style={{ fontSize: 11, marginInlineStart: 'auto' }}
            lang="en"
          >
            PRESS START
          </span>
        </Link>
      </main>

      {/* ── Sign out + footer ─────────────────────────────────────── */}
      <footer
        className="text-center"
        style={{ padding: '18px 24px', borderTop: '4px solid var(--gold-d)', background: 'var(--panel)' }}
      >
        <button
          type="button"
          onClick={handleSignOut}
          className="font-en-body leading-none"
          style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.1em' }}
          lang="en"
        >
          <span aria-hidden="true">✕ </span>SIGN OUT
        </button>
        <p
          className="font-en-body leading-none"
          style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.1em', marginTop: 12 }}
          lang="en"
        >
          V0.1 · BUILT FOR DIWANIYA NIGHTS
        </p>
      </footer>
    </div>
  );
}
