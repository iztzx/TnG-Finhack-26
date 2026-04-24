import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Financing from './pages/Financing';
import Shipments from './pages/Shipments';
import Transactions from './pages/Transactions';
import ComplianceHub from './pages/ComplianceHub';
import Analytics from './pages/Analytics';
import ArchitectureDiagram from './pages/ArchitectureDiagram';
import AIAssistant from './pages/AIAssistant';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-content">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/compliance" element={<ComplianceHub />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/architecture" element={<ArchitectureDiagram />} />
            <Route path="/assistant" element={<AIAssistant />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
