import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAdminAuth } from '../../lib/admin/auth';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const { signOut } = useAdminAuth();
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">Game content management</span>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={14} /> Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
