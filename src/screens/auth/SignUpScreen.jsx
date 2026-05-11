import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import BrandHeader from '../../components/BrandHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: 'البريد مطلوب · Email required' })
    .email({ message: 'بريد إلكتروني غير صالح · Invalid email' })
    .max(254),
  password: z
    .string()
    .min(8, { message: 'كلمة المرور قصيرة · Password too short (8+ chars)' })
    .max(72, { message: 'كلمة المرور طويلة جدًا · Password too long' }),
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'الاسم قصير جدًا · Name too short' })
    .max(40, { message: 'الاسم طويل جدًا · Name too long' }),
});

const IS_DEV_MOCK = import.meta.env.DEV && !isSupabaseConfigured;

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    continueAsGuest({ name, emoji: '🎲', mock: true });
    navigate('/setup');
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
          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-name" className="font-ar-ui text-sm text-cream-60 flex items-center gap-1">
              الاسم المعروض <span className="opacity-60" lang="en">· Display name</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="signup-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أبو علي"
                aria-invalid={!!errors.displayName}
                aria-describedby={errors.displayName ? 'signup-name-error' : undefined}
                className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
                  errors.displayName ? 'border-crimson' : 'border-gold-faint'
                } text-cream font-ar-body text-base focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
                autoComplete="name"
              />
            </div>
            {errors.displayName && (
              <span
                id="signup-name-error"
                role="alert"
                className="text-crimson text-xs font-ar-ui flex items-center gap-1"
              >
                <AlertCircle size={12} aria-hidden="true" /> {errors.displayName}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-email" className="font-ar-ui text-sm text-cream-60 flex items-center gap-1">
              البريد الإلكتروني <span className="opacity-60" lang="en">· Email</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="signup-email"
                type="email"
                dir="ltr"
                lang="en"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
                  errors.email ? 'border-crimson' : 'border-gold-faint'
                } text-cream font-en-body text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <span
                id="signup-email-error"
                role="alert"
                className="text-crimson text-xs font-ar-ui flex items-center gap-1"
              >
                <AlertCircle size={12} aria-hidden="true" /> {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password" className="font-ar-ui text-sm text-cream-60 flex items-center gap-1">
              كلمة المرور <span className="opacity-60" lang="en">· Password (8+ chars)</span>
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="signup-password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
                className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
                  errors.password ? 'border-crimson' : 'border-gold-faint'
                } text-cream font-en-body text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
                autoComplete="new-password"
              />
            </div>
            {errors.password && (
              <span
                id="signup-password-error"
                role="alert"
                className="text-crimson text-xs font-ar-ui flex items-center gap-1"
              >
                <AlertCircle size={12} aria-hidden="true" /> {errors.password}
              </span>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <div role="alert" className="rounded-lg border border-crimson/40 bg-crimson/10 px-3 py-2.5 text-xs">
              <p className="text-crimson font-ar-ui flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </p>
            </div>
          )}

          {/* Submit */}
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

          {/* Dev-only mock bypass */}
          {IS_DEV_MOCK && (
            <button
              type="button"
              onClick={handleMockSignUp}
              className="btn-outline px-4 py-2 rounded-lg text-xs flex flex-col items-center gap-0.5 mt-1"
            >
              <span>تخطي · وضع تجريبي</span>
              <span className="font-en-body opacity-70" lang="en">
                Skip · Mock sign-up (DEV only)
              </span>
            </button>
          )}
        </form>

        {/* Helper links */}
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
