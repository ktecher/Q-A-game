import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { emailField, passwordField } from './authSchemas';
import AuthCard from './AuthCard';
import AuthInput from './AuthInput';
import MockBypassButton from './MockBypassButton';
import SubmitAlert from './SubmitAlert';

const signInSchema = z.object({
  email: emailField,
  password: passwordField({ min: 6 }),
});

const IS_DEV_MOCK = import.meta.env.DEV && !isSupabaseConfigured;

export default function SignInScreen() {
  const navigate = useNavigate();
  const { continueAsGuest, isAuthenticated, isGuest, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Already signed in (real or guest)? Skip the form and send them home.
  // Gate on !loading so session rehydration doesn't flash the form on refresh.
  // Placed after the useState calls so the hook order stays stable across renders.
  if (!loading && (isAuthenticated || isGuest)) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setErrors({});

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0]] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!isSupabaseConfigured) {
      setSubmitError(
        'وضع تجريبي · Mock mode — Supabase not configured. Use the dev bypass below to continue.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(result.data);
      if (error) {
        setSubmitError(error.message);
      } else {
        navigate('/home');
      }
    } catch (err) {
      setSubmitError(`خطأ · ${err.message ?? 'Sign-in failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/home');
  };

  const handleMockSignIn = () => {
    const name = email.trim().split('@')[0] || 'مستخدم تجريبي';
    continueAsGuest({ name, mock: true });
    navigate('/home');
  };

  return (
    <AuthCard titleAr="تسجيل الدخول" titleEn="CONTINUE?">
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 20 }} noValidate>
        <AuthInput
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          labelAr="البريد"
          labelEn="Email"
          error={errors.email}
          lang="en"
          autoComplete="email"
        />
        <AuthInput
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          labelAr="كلمة السر"
          labelEn="Password"
          error={errors.password}
          autoComplete="current-password"
        />

        <SubmitAlert message={submitError} />

        <div className="flex items-stretch" style={{ gap: 14 }}>
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="flex-1 text-center transition-transform duration-100 enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px] disabled:cursor-wait disabled:opacity-60"
            style={{
              padding: 14,
              background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: '4px solid var(--outline)',
              boxShadow: '0 8px 0 var(--gold-sh)',
              color: 'var(--outline)',
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 32 }}>
              {submitting ? 'جارٍ الدخول…' : 'دخول'}
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
              {submitting ? 'LOADING…' : 'START'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleGuest}
            className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: '14px 20px',
              background: 'var(--panel2)',
              border: '4px solid var(--blue)',
              boxShadow: '0 8px 0 var(--shadow)',
              color: 'var(--text)',
            }}
          >
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 28 }}>
              ضيف
            </span>{' '}
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              lang="en"
            >
              GUEST
            </span>
          </button>
        </div>

        {IS_DEV_MOCK && (
          <MockBypassButton labelEn="MOCK SIGN-IN (DEV)" onClick={handleMockSignIn} />
        )}

        <div
          className="flex flex-wrap items-center justify-center text-center font-en-body leading-none"
          style={{ gap: 14, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.08em' }}
        >
          <Link to="/forgot-password">
            <span lang="en">FORGOT PASSWORD? · </span>نسيت كلمة السر
          </Link>
          <Link to="/signup">
            <span lang="en">NEW PLAYER? · </span>إنشاء حساب
          </Link>
          <Link to="/">
            <span lang="en">◄ TITLE</span>
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
