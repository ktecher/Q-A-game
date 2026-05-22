import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAdminAuth } from '../../lib/admin/auth';

export default function DashboardLogin() {
  const { signIn } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(username, password);
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
    // On success the auth provider flips `isAdmin` and the gate swaps this
    // screen for the dashboard — no need to clear `busy`.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Lock size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Umm Al Hayman — sign in to continue</p>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {error && (
          <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
