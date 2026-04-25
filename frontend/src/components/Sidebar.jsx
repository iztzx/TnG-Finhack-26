import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Banknote,
  Truck,
  Receipt,
  ShieldCheck,
  BarChart3,
  Network,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/financing', label: 'Financing', icon: Banknote },
  { path: '/shipments', label: 'Shipments', icon: Truck },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/architecture', label: 'Architecture', icon: Network },
  { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { path: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { path: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
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

  const NavList = ({ compact = false, onNavigate }) => (
    <nav className={`min-h-0 flex-1 overflow-y-auto ${compact ? 'py-4 px-3 space-y-1' : 'py-6 px-4 space-y-2'}`}>
      {!compact && (
        <div className="mb-4 px-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Workspace</p>
          <p className="mt-1 text-sm text-slate-400">Finance, logistics and compliance in one place.</p>
        </div>
      )}
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-tng-blue to-[#2a74c8] text-white shadow-lg shadow-blue-950/25'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!compact && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 mb-4 rounded-[28px] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">SME Workspace</p>
            <h1 className="truncate text-base font-semibold text-slate-900">
              {activeItem?.label || 'Dashboard'}
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute left-0 top-0 flex h-full w-[82%] max-w-[20rem] flex-col overflow-hidden bg-[#0f172a] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tng-blue to-[#2a74c8] shadow-lg shadow-blue-950/30">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-tight">TnG Trade</h1>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">SME Portal</p>
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
            <NavList onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-white/10 p-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tng-blue">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {userProfile?.companyName || userProfile?.email || 'User'}
                    </p>
                    <p className="truncate text-xs text-slate-400">{userProfile?.email || 'user@example.com'}</p>
                  </div>
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
          </aside>
        </div>
      )}

      <aside
        className={`sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-white/8 bg-[#0f172a] text-white transition-all duration-300 lg:flex ${
          collapsed ? 'w-22' : 'w-72'
        }`}
      >
        <div className="border-b border-white/10 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tng-blue to-[#2a74c8] shadow-lg shadow-blue-950/30">
              <Banknote className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-tight">TnG Trade</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    Live
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Working capital and shipment visibility for SMEs.</p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <NavList compact={collapsed} />

        <div className="border-t border-white/10 p-4">
          {!collapsed ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tng-blue">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {userProfile?.companyName || userProfile?.email || 'User'}
                  </p>
                  <p className="truncate text-xs text-slate-400">{userProfile?.email || 'user@example.com'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                Platform status: All services operational
              </div>
              <button
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tng-blue">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full justify-center rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 hover:bg-white/10"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
