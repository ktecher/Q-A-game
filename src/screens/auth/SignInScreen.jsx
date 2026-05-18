import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { z } from 'zod';
import BrandHeader from '../../components/BrandHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { emailField, passwordField } from './authSchemas';
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
          <AuthInput
            id="signin-email"
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
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            labelAr="كلمة المرور"
            labelEn="Password"
            icon={Lock}
            error={errors.password}
            dir="ltr"
            autoComplete="current-password"
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

          {IS_DEV_MOCK && (
            <MockBypassButton
              labelEn="Skip · Mock sign-in (DEV only)"
              onClick={handleMockSignIn}
            />
          )}
        </form>

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
