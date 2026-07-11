import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import BrandHeader from '../../components/BrandHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { emailField, passwordField } from './authSchemas';
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
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
        <div className="surface px-8 py-10 w-full max-w-md text-center">
          <BrandHeader subtitle={false} />
          <CheckCircle2 size={48} className="text-gold mx-auto mt-6" aria-hidden="true" />
          <h2 className="font-ar-body text-2xl text-cream mt-4">تم إنشاء الحساب</h2>
          <p className="font-en-display italic text-cream-60 text-base" lang="en">
            Account created
          </p>
          <p className="font-ar-ui text-base text-cream-60 mt-4">
            تحقق من بريدك الإلكتروني للتأكيد ثم سجّل الدخول.
          </p>
          <p className="font-en-body text-sm text-cream-45 mt-1" lang="en">
            Check your email for confirmation, then sign in.
          </p>
          <Link
            to="/signin"
            className="btn-gold px-6 py-3 rounded-xl text-base inline-flex flex-col items-center gap-0.5 mt-6"
          >
            <span>اذهب لتسجيل الدخول</span>
            <span className="font-en-body text-sm opacity-80" lang="en">
              Go to Sign In
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="surface px-8 py-10 w-full max-w-md">
        <BrandHeader subtitle={false} />

        <h2 className="text-center font-ar-body text-2xl text-cream mt-6">إنشاء حساب</h2>
        <p className="text-center font-en-display italic text-cream-60 text-base" lang="en">
          Sign Up
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
          <AuthInput
            id="signup-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="أبو علي"
            labelAr="الاسم المعروض"
            labelEn="Display name"
            icon={User}
            error={errors.displayName}
            autoComplete="name"
            inputFontClass="font-ar-body text-base"
          />
          <AuthInput
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            labelAr="البريد الإلكتروني"
            labelEn="Email"
            icon={Mail}
            error={errors.email}
            dir="ltr"
            lang="en"
            autoComplete="email"
          />
          <AuthInput
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            labelAr="كلمة المرور"
            labelEn="Password (8+ chars)"
            icon={Lock}
            error={errors.password}
            dir="ltr"
            autoComplete="new-password"
          />

          <SubmitAlert message={submitError} />

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="btn-gold px-6 py-3 rounded-xl text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span className="font-ar-ui">جارٍ الإنشاء...</span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-0.5">
                <span>إنشاء حساب</span>
                <span className="font-en-body text-sm font-medium opacity-80" lang="en">
                  Sign Up
                </span>
              </span>
            )}
          </button>

          {IS_DEV_MOCK && (
            <MockBypassButton
              labelEn="Skip · Mock sign-up (DEV only)"
              onClick={handleMockSignUp}
            />
          )}
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <p className="text-cream-45 font-en-body" lang="en">
            Already have an account?{' '}
            <Link to="/signin" className="text-gold hover:text-gold-light underline-offset-4 hover:underline">
              Sign In
            </Link>
          </p>
          <Link to="/" className="text-cream-45 hover:text-cream-60 transition mt-3 font-en-body" lang="en">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
