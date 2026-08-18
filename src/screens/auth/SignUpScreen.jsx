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

const signUpSchema = z.object({
  email: emailField,
  password: passwordField({ min: 8 }),
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'الاسم قصير جدًا · Name too short' })
    .max(40, { message: 'الاسم طويل جدًا · Name too long' }),
});

const IS_DEV_MOCK = import.meta.env.DEV && !isSupabaseConfigured;

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { continueAsGuest, isAuthenticated, isGuest, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

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

    const result = signUpSchema.safeParse({ email, password, displayName });
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
      const { error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          data: { display_name: result.data.displayName },
        },
      });
      if (error) {
        setSubmitError(error.message);
      } else {
        setSuccess(true);
        // Email confirmation required by default — user clicks link in email, then signs in
      }
    } catch (err) {
      setSubmitError(`خطأ · ${err.message ?? 'Sign-up failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockSignUp = () => {
    const name = displayName.trim() || email.trim().split('@')[0] || 'مستخدم تجريبي';
    continueAsGuest({ name, mock: true });
    navigate('/home');
  };

  if (success) {
    return (
      <AuthCard titleAr="تم إنشاء الحساب" titleEn="PLAYER READY">
        <div className="text-center flex flex-col items-center" style={{ gap: 18 }}>
          <span
            className="animate-bob"
            style={{ width: 44, height: 44, background: 'var(--green)', border: '4px solid var(--outline)' }}
            aria-hidden="true"
          />
          <div className="font-ar-body font-bold leading-none" style={{ fontSize: 30, color: 'var(--text)' }}>
            تحقق من بريدك الإلكتروني للتأكيد ثم سجّل الدخول.
          </div>
          <div
            className="font-en-body"
            style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.8, letterSpacing: '0.08em' }}
            lang="en"
          >
            CHECK YOUR EMAIL FOR CONFIRMATION, THEN SIGN IN.
          </div>
          <Link
            to="/signin"
            className="w-full text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: 14,
              background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: '4px solid var(--outline)',
              boxShadow: '0 8px 0 var(--gold-sh)',
              color: 'var(--outline)',
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 32 }}>
              تسجيل الدخول
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
              SIGN IN
            </span>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard titleAr="إنشاء حساب" titleEn="NEW PLAYER">
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 20 }} noValidate>
        <AuthInput
          id="signup-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="أبو علي"
          labelAr="الاسم المعروض"
          labelEn="Display name"
          error={errors.displayName}
          dir="rtl"
          autoComplete="name"
          inputFontClass="font-ar-body font-bold"
          inputFontSize={26}
        />
        <AuthInput
          id="signup-email"
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
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          labelAr="كلمة السر"
          labelEn="Password (8+)"
          error={errors.password}
          autoComplete="new-password"
        />

        <SubmitAlert message={submitError} />

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="w-full text-center transition-transform duration-100 enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px] disabled:cursor-wait disabled:opacity-60"
          style={{
            padding: 14,
            background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
            border: '4px solid var(--outline)',
            boxShadow: '0 8px 0 var(--gold-sh)',
            color: 'var(--outline)',
          }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 32 }}>
            {submitting ? 'جارٍ الإنشاء…' : 'إنشاء حساب'}
          </span>{' '}
          <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
            {submitting ? 'LOADING…' : 'START'}
          </span>
        </button>

        {IS_DEV_MOCK && (
          <MockBypassButton labelEn="MOCK SIGN-UP (DEV)" onClick={handleMockSignUp} />
        )}

        <div
          className="flex flex-wrap items-center justify-center text-center font-en-body leading-none"
          style={{ gap: 14, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.08em' }}
        >
          <Link to="/signin">
            <span lang="en">HAVE AN ACCOUNT? · </span>تسجيل الدخول
          </Link>
          <Link to="/">
            <span lang="en">◄ TITLE</span>
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
