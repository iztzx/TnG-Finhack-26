import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileSearch, BookOpen, Activity, Shield, LogOut, User } from 'lucide-react';
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
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="bg-[#0B0F1A] border-r border-gray-800 text-white w-64 flex flex-col h-full">
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

      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-gray-400 truncate">{userProfile?.email || 'admin@pantasflow.com'}</p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
