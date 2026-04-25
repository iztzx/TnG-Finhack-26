import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileSearch, BookOpen, Activity, Shield, LogOut, User, Menu, X, Sparkles } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = useMemo(
    () => navItems.find((item) => location.pathname.startsWith(item.path)),
    [location.pathname]
  );

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const NavContent = ({ onNavigate }) => (
    <>
      <nav className="min-h-0 flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div className="mb-4 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Operator Console</p>
          <p className="mt-1 text-sm text-slate-400">Approvals, treasury, risk and platform health.</p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-950/25'
                    : 'text-slate-400 hover:bg-white/6 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/8 space-y-3">
        <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userProfile?.email || 'admin@outandin.com'}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{userProfile?.role || 'Admin'}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
            Governance mode enabled
          </div>
          <button
            onClick={handleSignOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 mb-4 rounded-[28px] border border-white/8 bg-slate-950/60 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Admin Console</p>
            <h1 className="text-base font-semibold text-white">{activeItem?.label || 'Command Center'}</h1>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute left-0 top-0 flex h-full w-[82%] max-w-[20rem] flex-col overflow-hidden bg-[#09111f] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-950/30">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold">OUT&IN Admin</h1>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Operations</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-72 flex-col overflow-hidden border-r border-white/8 bg-[#09111f] text-white lg:flex">
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-950/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">OUT&IN Admin</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                  <Sparkles className="h-3 w-3" />
                  Monitor
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Clear operational control with platform-level metrics.</p>
            </div>
          </div>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
