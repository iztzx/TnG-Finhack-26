import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

const ReviewQueue = () => <div className="p-6 text-white text-2xl font-bold">Review Queue (Under Construction)</div>;
const SMEList = () => <div className="p-6 text-white text-2xl font-bold">SME Management (Under Construction)</div>;
const MasterLedger = () => <div className="p-6 text-white text-2xl font-bold">Finance & Treasury (Under Construction)</div>;
const SystemHealth = () => <div className="p-6 text-white text-2xl font-bold">System Health (Under Construction)</div>;
const AuditLog = () => <div className="p-6 text-white text-2xl font-bold">Audit Logs (Under Construction)</div>;

export default function App() {
  return (
    <BrowserRouter>
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
