import { Link, useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import BrandHeader from '../components/BrandHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();

  const handleGuest = () => {
    continueAsGuest();
    navigate('/setup');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative">
      {/* Top-right corner: theme toggle + sound icon */}
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <ThemeToggle size={16} />
        <button
          type="button"
          aria-label="Toggle sound"
          className="w-10 h-10 rounded-full surface flex items-center justify-center text-gold/80 hover:text-gold transition-colors duration-150"
        >
          <Volume2 size={16} />
        </button>
      </div>

      {/* Brand */}
      <div className="surface px-10 py-12 w-full max-w-md text-center">
        <BrandHeader />

        {/* CTAs */}
        <div className="flex flex-col gap-3 mt-10">
          <Link
            to="/signin"
            className="btn-gold px-6 py-3 rounded-xl text-base flex flex-col items-center gap-0.5"
          >
            <span>تسجيل الدخول</span>
            <span className="font-en-body text-sm font-medium opacity-80" lang="en">
              Sign In
            </span>
          </Link>

          <Link
            to="/signup"
            className="btn-outline px-6 py-3 rounded-xl text-base flex flex-col items-center gap-0.5"
          >
            <span>إنشاء حساب</span>
            <span className="font-en-body text-sm opacity-80" lang="en">
              Sign Up
            </span>
          </Link>

          <button
            type="button"
            onClick={handleGuest}
            className="btn-outline px-6 py-3 rounded-xl text-base flex flex-col items-center gap-0.5"
          >
            <span>العب كضيف</span>
            <span className="font-en-body text-sm opacity-80" lang="en">
              Continue as Guest
            </span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="font-en-body text-cream-45 text-sm mt-8 tracking-wider" lang="en">
        v0.1 · Built with care for diwaniya nights
      </p>
    </div>
  );
}
