import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileSearch, BookOpen, Activity, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/admin/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { path: '/admin/users', label: 'SME Management', icon: Users },
  { path: '/admin/review', label: 'Risk & Compliance', icon: FileSearch },
  { path: '/admin/ledger', label: 'Finance & Treasury', icon: BookOpen },
  { path: '/admin/system', label: 'System Health', icon: Activity },
  { path: '/admin/audit', label: 'Audit Logs', icon: Shield },
];

export default function AdminSidebar() {
  const { logout, userProfile } = useAuth();

  return (
    <aside className="bg-[#0B0F1A] border-r border-gray-800 text-white w-64 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">P</div>
          <div>
            <h1 className="text-sm font-bold">PantasFlow Admin</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{userProfile?.role || 'Admin'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
