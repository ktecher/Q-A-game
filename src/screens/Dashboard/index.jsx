// Admin dashboard root. Reachable only by typing /dashboard (no nav links to
// it anywhere in the app). Provides the isolated admin auth context and gates
// the whole area: loading → spinner, not an admin → login, admin → layout.
import { Loader2 } from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '../../lib/admin/auth';
import DashboardLogin from './DashboardLogin';
import DashboardLayout from './DashboardLayout';

function DashboardGate() {
  const { loading, session, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }
  if (!session || !isAdmin) return <DashboardLogin />;
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
