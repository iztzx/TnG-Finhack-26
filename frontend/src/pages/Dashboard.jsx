import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Truck,
  Shield,
  Banknote,
  Zap,
  Clock,
  Activity,
  ArrowRight,
  Wallet,
  CircleCheck,
  ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import KPICard from '../components/KPICard';
import { getDashboardData } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const defaultCashFlow = [
  { month: 'Nov', inflow: 45000, outflow: 12000 },
  { month: 'Dec', inflow: 62000, outflow: 18000 },
  { month: 'Jan', inflow: 38000, outflow: 15000 },
  { month: 'Feb', inflow: 71000, outflow: 22000 },
  { month: 'Mar', inflow: 55000, outflow: 19000 },
  { month: 'Apr', inflow: 97000, outflow: 31000 },
];

const activityIconMap = {
  FUNDED: { icon: Banknote, color: 'bg-green-50 text-green-600' },
  REPAID: { icon: Shield, color: 'bg-purple-50 text-purple-600' },
  OFFER_MADE: { icon: Zap, color: 'bg-tng-blue/10 text-tng-blue' },
  ANALYZED: { icon: Activity, color: 'bg-amber-50 text-amber-600' },
  PENDING_REVIEW: { icon: FileText, color: 'bg-blue-50 text-blue-600' },
};

const defaultActivities = [
  { id: 'ACT-001', title: 'Invoice submitted for financing', detail: 'INV-98234 | Syarikat ABC Sdn Bhd | RM 15,000', time: '2 min ago', icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { id: 'ACT-002', title: 'Funds disbursed to your wallet', detail: 'TXN-44512 | RM 23,000 released to your business', time: '15 min ago', icon: Banknote, color: 'bg-green-50 text-green-600' },
  { id: 'ACT-003', title: 'Shipment cleared customs', detail: 'SHP-7781 | Port Klang to Singapore Port', time: '1 hr ago', icon: Truck, color: 'bg-amber-50 text-amber-600' },
  { id: 'ACT-004', title: 'Invoice fully repaid', detail: 'INV-77102 | Mega Logistics | RM 25,000', time: '3 hrs ago', icon: Shield, color: 'bg-purple-50 text-purple-600' },
  { id: 'ACT-005', title: 'Credit line reviewed', detail: 'New line available: RM 350,000 (+12%)', time: '5 hrs ago', icon: Zap, color: 'bg-tng-blue/10 text-tng-blue' },
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
  const [cashFlowData, setCashFlowData] = useState(defaultCashFlow);
  const [activities, setActivities] = useState(defaultActivities);
  const quickStats = [
    { label: 'Active shipments', value: activeShipments, icon: Truck, tone: 'bg-blue-50 text-blue-600', action: () => navigate('/shipments') },
    { label: 'Partner feed health', value: 'All online', icon: Activity, tone: 'bg-violet-50 text-violet-600', action: () => navigate('/architecture') },
    { label: 'Compliance Score', value: `${complianceScore}%`, icon: Shield, tone: 'bg-green-50 text-green-600', action: () => navigate('/compliance') },
    { label: 'Average processing time', value: '~2.3s', icon: Clock, tone: 'bg-amber-50 text-amber-600', action: () => navigate('/analytics') },
  ];

  const userName = userProfile?.companyName?.split(' ')[0] || userProfile?.email?.split('@')[0] || 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    async function load() {
      setIsLoadingKpis(true);
      try {
        const dashboard = await getDashboardData();
        if (dashboard) {
          setKpis({
            totalFinanced: dashboard.totalFinanced || 368000,
            activeInvoices: dashboard.activeInvoices || 3,
            avgFactoringRate: (dashboard.avgFactoringRate || 0.028) * 100,
            repaymentRate: dashboard.totalFinanced > 0 ? ((dashboard.totalRepaid || 0) / (dashboard.totalFinanced || 1)) * 100 : 96.5,
          });

          // Use real cash flow data if available
          if (dashboard.cashFlow && dashboard.cashFlow.length > 0) {
            setCashFlowData(dashboard.cashFlow);
          } else if (dashboard.cashFlowSummary && dashboard.cashFlowSummary.length > 0) {
            setCashFlowData(dashboard.cashFlowSummary.map((item) => {
              const monthLabel = new Date(item.month + '-01').toLocaleString('en-US', { month: 'short' });
              return { month: monthLabel, inflow: item.disbursements || 0, outflow: Math.round((item.disbursements || 0) * 0.3) };
            }));
          }

          // Use real activity data if available
          if (dashboard.activities && dashboard.activities.length > 0) {
            setActivities(dashboard.activities.map((act) => {
              const mapping = activityIconMap[act.status] || { icon: FileText, color: 'bg-blue-50 text-blue-600' };
              return { ...act, icon: mapping.icon, color: mapping.color };
            }));
          }
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
    <div className="space-y-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.95fr)]">
        <section className="overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,_#0c4c8e_0%,_#005ABB_45%,_#2a74c8_100%)] p-5 text-white shadow-[0_24px_80px_rgba(0,90,187,0.24)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/80">
                <CircleCheck className="h-3.5 w-3.5" />
                Funding overview
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{getGreeting()}, {userName}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">
                See what has been advanced to your business, what is pending next, and where to act without digging through multiple tabs.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button onClick={() => navigate('/financing')} className="rounded-3xl border border-white/10 bg-white/10 p-4 text-left backdrop-blur-sm hover:bg-white/14">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Credit line</p>
                  <p className="mt-2 text-xl font-semibold">RM {creditLimit.toLocaleString()}</p>
                </button>
                <button onClick={() => navigate('/shipments')} className="rounded-3xl border border-white/10 bg-white/10 p-4 text-left backdrop-blur-sm hover:bg-white/14">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Active shipments</p>
                  <p className="mt-2 text-xl font-semibold">{activeShipments}</p>
                </button>
                <button onClick={() => navigate('/compliance')} className="rounded-3xl border border-white/10 bg-white/10 p-4 text-left backdrop-blur-sm hover:bg-white/14">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Compliance Score</p>
                  <p className="mt-2 text-xl font-semibold">{complianceScore}%</p>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:min-w-0 lg:max-w-[260px]">
              <button
                onClick={() => navigate('/financing')}
                className="flex items-center justify-between rounded-3xl border border-white/15 bg-white px-5 py-3.5 text-left text-tng-blue shadow-lg shadow-blue-950/15 hover:bg-slate-100"
              >
                <div>
                  <p className="text-sm font-semibold">Start financing</p>
                  <p className="mt-1 text-xs text-slate-500">Upload an invoice and receive an offer.</p>
                </div>
                <Banknote className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="flex items-center justify-between rounded-3xl border border-white/15 bg-white/10 px-5 py-3.5 text-left text-white hover:bg-white/15"
              >
                <div>
                  <p className="text-sm font-semibold">Review repayments</p>
                  <p className="mt-1 text-xs text-white/70">Track funded and settled invoices.</p>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Today</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">What needs attention</h2>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Healthy</div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Offers ready to accept', value: '2', detail: 'Decision window closes in 24 hours', icon: Wallet, color: 'bg-blue-50 text-blue-600', action: () => navigate('/financing') },
              { label: 'Invoices awaiting review', value: '1', detail: 'Uploaded today and queued for analysis', icon: FileText, color: 'bg-amber-50 text-amber-600', action: () => navigate('/transactions') },
              { label: 'Upcoming repayment dates', value: '3', detail: 'All due within the next 14 days', icon: Clock, color: 'bg-emerald-50 text-emerald-600', action: () => navigate('/transactions') },
            ].map((item) => (
              <button key={item.label} onClick={item.action} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left transition-colors hover:bg-slate-50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <span className="text-base font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isLoadingKpis ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-[28px] border border-white/70 bg-white/80 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            icon={Banknote}
            title="Total Advanced To You"
            value={`RM ${(kpis.totalFinanced / 1000000).toFixed(1)}M`}
            trend={18.5}
            trendUp={true}
            hint="Open transactions"
            onClick={() => navigate('/transactions')}
          />
          <KPICard
            icon={FileText}
            title="Active Invoices"
            value={String(kpis.activeInvoices)}
            trend={1}
            trendUp={true}
            hint="Continue financing"
            onClick={() => navigate('/financing')}
          />
          <KPICard
            icon={TrendingUp}
            title="Average Funding Cost"
            value={`${kpis.avgFactoringRate.toFixed(1)}%`}
            trend={0.3}
            trendUp={false}
            hint="View analytics"
            onClick={() => navigate('/analytics')}
          />
          <KPICard
            icon={Shield}
            title="Repayment Completion"
            value={`${kpis.repaymentRate.toFixed(1)}%`}
            trend={2.1}
            trendUp={true}
            hint="Open compliance"
            onClick={() => navigate('/compliance')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.95fr)]">
        <section className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cash position over time</h2>
              <p className="mt-1 text-sm text-slate-500">Disbursements received versus repayments and charges.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value) => [`RM ${Number(value).toLocaleString()}`, undefined]}
              />
              <Area type="monotone" dataKey="inflow" stroke="#005ABB" strokeWidth={2.5} fill="url(#inflowGrad)" name="Disbursements" />
              <Area type="monotone" dataKey="outflow" stroke="#F5A623" strokeWidth={2.5} fill="url(#outflowGrad)" name="Repayments & charges" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="space-y-4">
          <div className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">Quick stats</h2>
            <div className="mt-5 space-y-4">
              {quickStats.map((stat, index) => (
                <div key={stat.label}>
                  <button onClick={stat.action} className="flex w-full items-center gap-3 rounded-3xl p-1 text-left hover:bg-slate-50/80">
                    <div className={`rounded-2xl p-3 ${stat.tone}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                      <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                    </div>
                  </button>
                  {index < quickStats.length - 1 && <div className="h-px bg-slate-100" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-500">A clean timeline of what changed across financing, shipments and compliance.</p>
          </div>
          <button onClick={() => navigate('/transactions')} className="inline-flex items-center gap-1 text-sm font-medium text-tng-blue hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {activities.map((act) => (
            <button key={act.id} onClick={() => navigate(act.icon === Truck ? '/shipments' : '/transactions')} className="flex items-start gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left transition-colors hover:bg-slate-50">
              <div className={`mt-0.5 rounded-2xl p-3 ${act.color}`}>
                <act.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{act.title}</p>
                <p className="mt-1 text-xs text-slate-500">{act.detail}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-slate-400">{act.time}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
