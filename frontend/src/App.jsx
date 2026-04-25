import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/admin/AdminSidebar';
import ToastContainer from './components/ToastContainer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Financing from './pages/Financing';
import Shipments from './pages/Shipments';
import Transactions from './pages/Transactions';
import ComplianceHub from './pages/ComplianceHub';
import Analytics from './pages/Analytics';
import ArchitectureDiagram from './pages/ArchitectureDiagram';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import CommandCenter from './pages/admin/CommandCenter';

const AppLayout = () => (
  <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(0,90,187,0.12),_transparent_30%),linear-gradient(180deg,_#f5f7fb_0%,_#edf2f8_100%)] lg:flex">
    <Sidebar />
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-4 lg:px-6">
        <Outlet />
      </div>
    </main>
  </div>
);

const AdminLayout = () => (
  <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_25%),linear-gradient(180deg,_#09111f_0%,_#0f1728_100%)] lg:flex">
    <AdminSidebar />
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-5 sm:py-4 lg:px-6">
        <Outlet />
      </div>
    </main>
  </div>
);

const AdminPlaceholder = ({ title, description }) => (
  <div className="space-y-6">
    <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </section>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-[28px] border border-white/8 bg-slate-950/45 p-5 shadow-sm backdrop-blur animate-pulse" />
      ))}
    </div>
  </div>
);

const ReviewQueue = () => <AdminPlaceholder title="Review Queue" description="Pending invoice reviews and risk assessments will appear here." />;
const SMEList = () => <AdminPlaceholder title="SME Management" description="Manage registered SMEs, view onboarding status, and update profiles." />;
const MasterLedger = () => <AdminPlaceholder title="Finance & Treasury" description="Treasury reports, disbursement batches, and ledger reconciliation." />;
const SystemHealth = () => <AdminPlaceholder title="System Health" description="Platform uptime, API latency, and service status monitoring." />;
const AuditLog = () => <AdminPlaceholder title="Audit Logs" description="Immutable audit trail of all platform actions and decisions." />;

function AuthRedirectHandler() {
  const { authRedirect, clearAuthRedirect } = useAuth();
  if (authRedirect) {
    clearAuthRedirect();
    return <Navigate to={authRedirect} />;
  }
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirectHandler />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/compliance" element={<ComplianceHub />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/architecture" element={<ArchitectureDiagram />} />
            <Route path="/assistant" element={<AIAssistant />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<CommandCenter />} />
            <Route path="/admin/review" element={<ReviewQueue />} />
            <Route path="/admin/users" element={<SMEList />} />
            <Route path="/admin/ledger" element={<MasterLedger />} />
            <Route path="/admin/system" element={<SystemHealth />} />
            <Route path="/admin/audit" element={<AuditLog />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
