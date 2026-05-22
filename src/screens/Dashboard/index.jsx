// Admin dashboard root. Reachable only by typing /dashboard (no nav links to
// it anywhere in the app). Provides the isolated admin auth context and gates
// the whole area: loading → spinner, no session → login, signed-in non-admin
// → sign out + /signin, admin → layout.
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from '../../lib/admin/auth';
import DashboardLogin from './DashboardLogin';
import DashboardLayout from './DashboardLayout';

function DashboardGate() {
  const { loading, session, isAdmin, signOut } = useAdminAuth();

  // A signed-in non-admin keeps no dashboard session: sign them out of the
  // isolated admin client, then bounce them to /signin. Only the admin client
  // is touched here — the game's own auth session is left untouched.
  const nonAdmin = !loading && !!session && !isAdmin;
  useEffect(() => {
    if (nonAdmin) signOut();
  }, [nonAdmin, signOut]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }
  // Not signed in → the dashboard's own login form.
  if (!session) return <DashboardLogin />;
  // Signed in but not a registered admin → bounce to the game's sign-in page.
  if (!isAdmin) return <Navigate to="/signin" replace />;
  return <DashboardLayout />;
}

export default function Dashboard() {
  return (
    <AdminAuthProvider>
      <div dir="ltr" className="font-en-body">
        <DashboardGate />
      </div>
    </AdminAuthProvider>
  );
}
