import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, Truck, Shield, Banknote, Zap, Clock, Activity, ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import KPICard from '../components/KPICard';
import { getAnalytics } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const mockCashFlow = [
  { month: 'Nov', inflow: 45000, outflow: 12000 },
  { month: 'Dec', inflow: 62000, outflow: 18000 },
  { month: 'Jan', inflow: 38000, outflow: 15000 },
  { month: 'Feb', inflow: 71000, outflow: 22000 },
  { month: 'Mar', inflow: 55000, outflow: 19000 },
  { month: 'Apr', inflow: 97000, outflow: 31000 },
];

const mockActivities = [
  { id: 'ACT-001', type: 'invoice_submitted', title: 'Invoice submitted for financing', detail: 'INV-98234 · Syarikat ABC Sdn Bhd · RM 15,000', time: '2 min ago', icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { id: 'ACT-002', type: 'funds_disbursed', title: 'Funds disbursed to wallet', detail: 'TXN-44512 · RM 23,000 net after fees', time: '15 min ago', icon: Banknote, color: 'bg-green-50 text-green-600' },
  { id: 'ACT-003', type: 'shipment_update', title: 'Shipment cleared customs', detail: 'SHP-7781 · Port Klang → Singapore Port', time: '1 hr ago', icon: Truck, color: 'bg-amber-50 text-amber-600' },
  { id: 'ACT-004', type: 'invoice_repaid', title: 'Invoice fully repaid', detail: 'INV-77102 · Mega Logistics · RM 25,000', time: '3 hrs ago', icon: Shield, color: 'bg-purple-50 text-purple-600' },
  { id: 'ACT-005', type: 'credit_assessment', title: 'Credit limit reviewed', detail: 'New limit: RM 350,000 (+12%)', time: '5 hrs ago', icon: Zap, color: 'bg-tng-blue/10 text-tng-blue' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [kpis, setKpis] = useState({
    totalFinanced: 368000,
    activeInvoices: 3,
    avgFactoringRate: 2.8,
    repaymentRate: 96.5,
  });
  const [creditLimit] = useState(350000);
  const [activeShipments] = useState(4);
  const [complianceScore] = useState(98);
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);

  const userName = userProfile?.companyName?.split(' ')[0] || userProfile?.email?.split('@')[0] || 'User';

  useEffect(() => {
    async function load() {
      setIsLoadingKpis(true);
      try {
        const analytics = await getAnalytics();
        if (analytics) {
          setKpis({
            totalFinanced: analytics.totalFinanced || 368000,
            activeInvoices: analytics.activeInvoices || 3,
            avgFactoringRate: (analytics.avgFactoringRate || 0.028) * 100,
            repaymentRate: analytics.totalFinanced > 0 ? ((analytics.totalRepaid || 0) / (analytics.totalFinanced || 1)) * 100 : 96.5,
          });
        }
      } catch {
        // keep defaults
      } finally {
        setIsLoadingKpis(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-tng-blue to-tng-blue-dark rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
            <p className="text-white/80 mt-1">Your trade finance dashboard — instant cash for invoices & shipments.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-white/70">Available Credit Line:</span>
              <span className="text-xl font-bold">RM {creditLimit.toLocaleString()}</span>
              <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">Active</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/financing')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-tng-blue rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-sm"
            >
              <Banknote className="w-4 h-4" />
              Finance an Invoice
            </button>
            <button
              onClick={() => navigate('/shipments')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/20 transition-all hover:scale-105 border border-white/20"
            >
              <Truck className="w-4 h-4" />
              Track Shipment
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoadingKpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Banknote}
            title="Total Financed"
            value={`RM ${(kpis.totalFinanced / 1000000).toFixed(1)}M`}
            trend={18.5}
            trendUp={true}
          />
          <KPICard
            icon={FileText}
            title="Active Invoices"
            value={String(kpis.activeInvoices)}
            trend={1}
            trendUp={true}
          />
          <KPICard
            icon={TrendingUp}
            title="Avg Factoring Rate"
            value={`${kpis.avgFactoringRate.toFixed(1)}%`}
            trend={0.3}
            trendUp={false}
          />
          <KPICard
            icon={Shield}
            title="Repayment Rate"
            value={`${kpis.repaymentRate.toFixed(1)}%`}
            trend={2.1}
            trendUp={true}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cash Flow Overview</h2>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mockCashFlow} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005ABB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#005ABB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5A623" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value) => [`RM ${Number(value).toLocaleString()}`, undefined]}
              />
              <Area type="monotone" dataKey="inflow" stroke="#005ABB" strokeWidth={2} fill="url(#inflowGrad)" name="Disbursements" />
              <Area type="monotone" dataKey="outflow" stroke="#F5A623" strokeWidth={2} fill="url(#outflowGrad)" name="Fees & Repayments" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Shipments</p>
                <p className="text-lg font-bold text-gray-900">{activeShipments}</p>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Carrier API Status</p>
                <p className="text-lg font-bold text-gray-900">All Online</p>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-50">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Compliance Score</p>
                <p className="text-lg font-bold text-gray-900">{complianceScore}%</p>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg. Processing Time</p>
                <p className="text-lg font-bold text-gray-900">~2.3s</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button onClick={() => navigate('/transactions')} className="text-sm text-tng-blue font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {mockActivities.map((act) => (
            <div key={act.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-lg ${act.color} mt-0.5`}>
                <act.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{act.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{act.detail}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
