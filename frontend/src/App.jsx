import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Original Components
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/admin/AdminSidebar';
import Dashboard from './pages/Dashboard';
import Financing from './pages/Financing';
import Shipments from './pages/Shipments';
import Transactions from './pages/Transactions';
import ComplianceHub from './pages/ComplianceHub';
import Analytics from './pages/Analytics';
import ArchitectureDiagram from './pages/ArchitectureDiagram';
import AIAssistant from './pages/AIAssistant';

// Admin Pages
import CommandCenter from './pages/admin/CommandCenter';

// Layout implementations
const AppLayout = () => (
  <div className="flex h-screen overflow-hidden bg-content">
    <Sidebar />
    <main className="flex-1 overflow-auto">
      <Outlet />
    </main>
  </div>
);

const AdminLayout = () => (
  <div className="flex h-screen overflow-hidden bg-[#0B0F1A]">
    <AdminSidebar />
    <main className="flex-1 overflow-auto bg-gray-900">
      <Outlet />
    </main>
  </div>
);

// Admin Placeholder Components
const ReviewQueue = () => <div className="p-6 text-white text-2xl font-bold">Review Queue (Under Construction)</div>;
const SMEList = () => <div className="p-6 text-white text-2xl font-bold">SME Management (Under Construction)</div>;
const MasterLedger = () => <div className="p-6 text-white text-2xl font-bold">Finance & Treasury (Under Construction)</div>;
const SystemHealth = () => <div className="p-6 text-white text-2xl font-bold">System Health (Under Construction)</div>;
const AuditLog = () => <div className="p-6 text-white text-2xl font-bold">Audit Logs (Under Construction)</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* SME User Portal — requires authentication */}
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
            {/* Provide backward compatibility for any links going to / */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Admin Portal — requires admin role */}
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

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
