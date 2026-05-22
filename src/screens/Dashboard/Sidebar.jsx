import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  HelpCircle,
  Drama,
  Swords,
  Palette,
  Users,
  Settings,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/dashboard/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/dashboard/questions', icon: HelpCircle, label: 'Questions' },
  { to: '/dashboard/wala-kalma', icon: Drama, label: 'Wala Kalma' },
  { to: '/dashboard/challenge-prompts', icon: Swords, label: 'Challenge Prompts' },
  { to: '/dashboard/drawing-words', icon: Palette, label: 'Drawing Words' },
  { to: '/dashboard/users', icon: Users, label: 'Users & Sessions' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-800 bg-slate-900 p-3">
      <div className="px-2 pb-3 pt-2">
        <div className="text-sm font-bold text-white">Umm Al Hayman</div>
        <div className="text-xs text-slate-400">Admin Dashboard</div>
      </div>
      {NAV.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-indigo-600 font-semibold text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
