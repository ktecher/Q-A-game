import { Link, Navigate, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

// The seven-square rule under the wordmark.
const DIVIDER = ['var(--gold-d)', 'var(--blue)', 'var(--red)', '#F4ECD8', 'var(--red)', 'var(--blue)', 'var(--gold-d)'];

// One span painting eight stars via box-shadow offsets, exactly as the
// reference sheet does — cheaper than eight elements.
const STAR_FIELD =
  '160px 40px 0 var(--gold-d), 420px -20px 0 #F4ECD8, 700px 90px 0 var(--blue), ' +
  '980px 20px 0 #F4ECD8, 1080px 160px 0 var(--gold-d), 260px 220px 0 var(--blue), ' +
  '620px 300px 0 #F4ECD8';

function MenuButton({ as: Tag = 'button', ar, en, tone, ...rest }) {
  const gold = tone === 'gold';
  return (
    <Tag
      {...rest}
      className="flex items-center gap-3 w-full transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
      style={{
        padding: '14px 20px',
        background: gold ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)' : 'var(--panel)',
        border: `4px solid ${gold ? 'var(--outline)' : tone === 'blue' ? 'var(--blue)' : 'var(--gold-d)'}`,
        boxShadow: gold
          ? '0 8px 0 var(--gold-sh), inset 4px 4px 0 rgba(255, 255, 255, 0.35)'
          : '0 8px 0 var(--shadow)',
        color: gold ? 'var(--outline)' : 'var(--text)',
      }}
    >
      {gold && (
        <span className="font-en-body leading-none" style={{ fontSize: 12 }} aria-hidden="true">
          ▶
        </span>
      )}
      <span className="font-ar-body font-bold leading-none" style={{ fontSize: 32 }}>
        {ar}
      </span>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 11, color: gold ? 'var(--outline)' : 'var(--muted)', marginInlineStart: 'auto' }}
        lang="en"
      >
        {en}
      </span>
    </Tag>
  );
}

export default function LandingScreen() {
  const navigate = useNavigate();
  const { continueAsGuest, isAuthenticated, isGuest, loading } = useAuth();

  // Logged-in users (real or guest) belong on /home, not the marketing landing.
  // Gate on !loading so a session-rehydration tick doesn't flash the sign-in CTAs.
  if (!loading && (isAuthenticated || isGuest)) {
    return <Navigate to="/home" replace />;
  }

  const handleGuest = () => {
    continueAsGuest();
    navigate('/home');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-5 py-16">
      {/* Star field */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none hidden md:block"
        style={{ top: 80, left: 120, width: 4, height: 4, background: '#F4ECD8', boxShadow: STAR_FIELD }}
      />

      {/* Brick floor */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: 96,
          backgroundColor: 'var(--panel)',
          backgroundImage:
            'linear-gradient(90deg, var(--panel2) 50%, transparent 50%), linear-gradient(var(--line) 50%, transparent 50%)',
          backgroundSize: '64px 32px, 64px 32px',
          borderTop: '4px solid var(--gold-d)',
        }}
      />

      <div className="absolute top-5 start-5 z-[3]">
        <ThemeToggle size={52} />
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 13, color: 'var(--blue)', letterSpacing: '0.24em', marginBottom: 10 }}
          lang="en"
        >
          ◄ 1 PLAYER TEAM VS TEAM ►
        </div>

        <h1
          className="font-ar-body font-extrabold m-0"
          style={{
            // The sheet's flat 118px is a 1280px-wide design; scale it so the
            // wordmark still fits a phone.
            fontSize: 'clamp(52px, 9vw, 118px)',
            lineHeight: 0.9,
            color: 'var(--gold-ink)',
            textShadow: '6px 6px 0 var(--gold-sh), 12px 12px 0 var(--shadow)',
          }}
        >
          مدينة أم الهيمان
        </h1>

        <div
          className="font-en-body leading-none"
          style={{
            fontSize: 'clamp(11px, 2vw, 22px)',
            color: 'var(--text)',
            letterSpacing: '0.12em',
            textShadow: '4px 4px 0 var(--red-d)',
            marginTop: 14,
          }}
          lang="en"
        >
          UMM AL HAYMAN CITY
        </div>

        <div className="flex" style={{ gap: 6, marginTop: 22 }} aria-hidden="true">
          {DIVIDER.map((color, i) => (
            <span key={i} style={{ width: 12, height: 12, background: color }} />
          ))}
        </div>

        <div
          className="font-ar-body flex items-center flex-wrap justify-center gap-2"
          style={{ fontSize: 34, color: 'var(--text)', marginTop: 18 }}
        >
          لعبة العائلة ·
          <span className="font-en-body" style={{ fontSize: 13, color: 'var(--muted)' }} lang="en">
            THE FAMILY TRIVIA GAME
          </span>
        </div>

        <div
          className="flex flex-col w-full"
          style={{ gap: 12, marginTop: 34, minWidth: 0, maxWidth: 420 }}
        >
          <MenuButton as={Link} to="/signin" ar="تسجيل الدخول" en="SIGN IN" tone="gold" />
          <MenuButton as={Link} to="/signup" ar="إنشاء حساب" en="SIGN UP" tone="goldOutline" />
          <MenuButton type="button" onClick={handleGuest} ar="العب كضيف" en="GUEST" tone="blue" />
        </div>

        <div
          className="font-en-body leading-none animate-blink"
          style={{ fontSize: 16, color: 'var(--gold-ink)', letterSpacing: '0.18em', marginTop: 30 }}
          lang="en"
        >
          INSERT COIN — PRESS START
        </div>
      </div>

      <div
        className="absolute inset-x-0 text-center font-en-body leading-none"
        style={{ bottom: 26, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}
        lang="en"
      >
        V0.1 · BUILT FOR DIWANIYA NIGHTS
      </div>
    </div>
  );
}
