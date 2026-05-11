import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import BrandHeader from '../../components/BrandHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: 'البريد مطلوب · Email required' })
    .email({ message: 'بريد إلكتروني غير صالح · Invalid email' })
    .max(254),
  password: z
    .string()
    .min(6, { message: 'كلمة المرور قصيرة جدًا · Password too short (6+ chars)' })
    .max(72, { message: 'كلمة المرور طويلة جدًا · Password too long' }),
});

const IS_DEV_MOCK = import.meta.env.DEV && !isSupabaseConfigured;

export default function SignInScreen() {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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
        navigate('/setup');
      }
    } catch (err) {
      setSubmitError(`خطأ · ${err.message ?? 'Sign-in failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockSignIn = () => {
    const name = email.trim().split('@')[0] || 'مستخدم تجريبي';
    continueAsGuest({ name, emoji: '🎲', mock: true });
    navigate('/setup');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="surface px-8 py-10 w-full max-w-md">
        <BrandHeader subtitle={false} />

        <h2 className="text-center font-ar-body text-2xl text-cream mt-6">تسجيل الدخول</h2>
        <p className="text-center font-en-display italic text-cream-60 text-base" lang="en">
          Sign In
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signin-email" className="font-ar-ui text-sm text-cream-60 flex items-center gap-1">
              البريد الإلكتروني <span className="opacity-60" lang="en">· Email</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="signin-email"
                type="email"
                dir="ltr"
                lang="en"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signin-email-error' : undefined}
                className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
                  errors.email ? 'border-crimson' : 'border-gold-faint'
                } text-cream font-en-body text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <span
                id="signin-email-error"
                role="alert"
                className="text-crimson text-xs font-ar-ui flex items-center gap-1"
              >
                <AlertCircle size={12} aria-hidden="true" /> {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signin-password" className="font-ar-ui text-sm text-cream-60 flex items-center gap-1">
              كلمة المرور <span className="opacity-60" lang="en">· Password</span>
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="signin-password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signin-password-error' : undefined}
                className={`w-full ps-10 pe-3 py-2.5 rounded-lg bg-ink-80 border ${
                  errors.password ? 'border-crimson' : 'border-gold-faint'
                } text-cream font-en-body text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition`}
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <span
                id="signin-password-error"
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
                <span className="font-ar-ui">جارٍ الدخول...</span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-0.5">
                <span>تسجيل الدخول</span>
                <span className="font-en-body text-sm font-medium opacity-80" lang="en">
                  Sign In
                </span>
              </span>
            )}
          </button>

          {/* Dev-only mock bypass */}
          {IS_DEV_MOCK && (
            <button
              type="button"
              onClick={handleMockSignIn}
              className="btn-outline px-4 py-2 rounded-lg text-xs flex flex-col items-center gap-0.5 mt-1"
            >
              <span>تخطي · وضع تجريبي</span>
              <span className="font-en-body opacity-70" lang="en">
                Skip · Mock sign-in (DEV only)
              </span>
            </button>
          )}
        </form>

        {/* Helper links */}
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link to="/forgot-password" className="text-cream-60 hover:text-gold transition font-en-body" lang="en">
            Forgot password?
          </Link>
          <p className="text-cream-45 font-en-body" lang="en">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-gold hover:text-gold-light underline-offset-4 hover:underline">
              Sign Up
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
