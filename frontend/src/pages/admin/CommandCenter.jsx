import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Clock, FileText, RefreshCw, ShieldCheck, Wallet, ArrowRight, Banknote, TimerReset, CheckCircle2, TrendingUp } from 'lucide-react';
import { getAdminOverview } from '../../lib/api';

export default function CommandCenter() {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [metrics, setMetrics] = React.useState({
    totalInvoices: 142,
    capitalDeployed: 4200000,
    overdueExposure: 85000,
    pendingReview: 18,
  });
  const [activityFeed, setActivityFeed] = React.useState(null);

  // Load real data on mount
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAdminOverview();
      if (data) {
        setMetrics((prev) => ({
          ...prev,
          totalInvoices: data.totalInvoices || prev.totalInvoices,
          capitalDeployed: data.capitalDeployed || prev.capitalDeployed,
          pendingReview: data.pendingReview ?? prev.pendingReview,
        }));

        // Build activity feed from real invoices
        if (data.invoices?.length > 0) {
          const feed = data.invoices.slice(0, 5).map((inv) => {
            const statusMap = {
              FUNDED: { icon: Banknote, title: `Invoice #${inv.invoiceId} funded`, meta: `RM ${(inv.offerData?.netDisbursement || inv.amount || 0).toLocaleString()} disbursed`, badge: 'Treasury', badgeTone: 'bg-blue-500/15 text-blue-300' },
              REPAID: { icon: CheckCircle2, title: `Invoice #${inv.invoiceId} repaid`, meta: `RM ${(inv.amount || 0).toLocaleString()} settled`, badge: 'Approved', badgeTone: 'bg-emerald-500/15 text-emerald-300' },
              OFFER_MADE: { icon: CheckCircle2, title: `Invoice #${inv.invoiceId} approved`, meta: `Offer generated for ${inv.vendorName || 'SME'}`, badge: 'Approved', badgeTone: 'bg-emerald-500/15 text-emerald-300' },
              PENDING_REVIEW: { icon: TimerReset, title: `Invoice #${inv.invoiceId} queued`, meta: `Awaiting risk review`, badge: 'Ops', badgeTone: 'bg-violet-500/15 text-violet-300' },
              ANALYZED: { icon: Activity, title: `Invoice #${inv.invoiceId} scored`, meta: `ML scoring complete`, badge: 'System', badgeTone: 'bg-cyan-500/15 text-cyan-300' },
            };
            const mapping = statusMap[inv.status] || statusMap.PENDING_REVIEW;
            return {
              ...mapping,
              time: inv.invoiceDate || 'Recent',
            };
          });
          setActivityFeed(feed);
        }
      }
    } catch {
      // keep defaults
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const topMetrics = [
    { label: 'Invoices in system', value: String(metrics.totalInvoices), delta: 'Total across all SMEs', icon: FileText, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
    { label: 'Capital currently deployed', value: `RM ${(metrics.capitalDeployed / 1000000).toFixed(1)}M`, delta: 'Active funded invoices', icon: Wallet, tone: 'from-emerald-500/20 to-emerald-400/5 text-emerald-100 border-emerald-400/15' },
    { label: 'Overdue exposure', value: `RM ${(metrics.overdueExposure / 1000).toFixed(0)}k`, delta: 'Requires monitoring', icon: AlertCircle, tone: 'from-rose-500/20 to-rose-400/5 text-rose-100 border-rose-400/15' },
    { label: 'Cases pending review', value: String(metrics.pendingReview), delta: 'Awaiting action', icon: Clock, tone: 'from-violet-500/20 to-violet-400/5 text-violet-100 border-violet-400/15' },
  ];

  const actionQueue = [
    { title: 'Review pending invoices', meta: `${metrics.pendingReview} submissions waiting on action`, accent: 'bg-blue-600', count: String(metrics.pendingReview), route: '/admin/review' },
    { title: 'Approve disbursement batches', meta: '5 ready after risk checks', accent: 'bg-slate-700', count: '5', route: '/admin/ledger' },
    { title: 'Resolve fraud alerts', meta: '1 high-priority anomaly surfaced', accent: 'bg-rose-600', count: '1', route: '/admin/audit' },
    { title: 'Generate treasury report', meta: 'Export today\'s funding summary', accent: 'bg-emerald-600', count: 'Live', route: '/admin/system' },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Platform oversight
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Command Center</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A cleaner operator view for approvals, deployment, delinquency and throughput, without blending customer-facing metrics into the admin flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topMetrics.map((metric) => (
          <div key={metric.label} className={`rounded-[28px] border bg-gradient-to-br ${metric.tone} p-5 shadow-sm backdrop-blur`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-300">{metric.label}</p>
                <h3 className="mt-3 text-3xl font-semibold text-white">{metric.value}</h3>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <metric.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              <TrendingUp className="h-4 w-4" />
              {metric.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <section className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Operational activity</h2>
              <p className="mt-1 text-sm text-slate-400">A readable feed of approvals, escalations and system actions.</p>
            </div>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-cyan-200 hover:text-white">
              Open audit trail <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {(activityFeed || [
              { icon: CheckCircle2, title: 'Invoice #INV-2026-1001 approved', meta: 'Approved by Finance Manager', time: '10 minutes ago', badge: 'Approved', badgeTone: 'bg-emerald-500/15 text-emerald-300' },
              { icon: Banknote, title: 'Disbursement batch released', meta: 'RM 350,000 settled to 7 SMEs', time: '22 minutes ago', badge: 'Treasury', badgeTone: 'bg-blue-500/15 text-blue-300' },
              { icon: AlertCircle, title: 'Fraud alert escalated', meta: 'Duplicate invoice evidence detected', time: '34 minutes ago', badge: 'Alert', badgeTone: 'bg-rose-500/15 text-rose-300' },
              { icon: TimerReset, title: 'Review queue SLA reset', meta: 'Priority reviewer reassigned', time: '48 minutes ago', badge: 'Ops', badgeTone: 'bg-violet-500/15 text-violet-300' },
              { icon: Activity, title: 'Carrier verification resynced', meta: 'All route integrity checks passed', time: '1 hour ago', badge: 'System', badgeTone: 'bg-cyan-500/15 text-cyan-300' },
            ]).map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="mt-0.5 rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-cyan-200">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.badgeTone}`}>{item.badge}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500">{item.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Action queue</h2>
            <div className="mt-5 space-y-3">
              {actionQueue.map((item) => (
                <button key={item.title} onClick={() => navigate(item.route)} className={`w-full rounded-3xl ${item.accent} px-4 py-4 text-left text-white transition-transform hover:-translate-y-0.5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-white/75">{item.meta}</p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{item.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Operator snapshot</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: 'Treasury utilisation', value: '68%', icon: Wallet },
                { label: 'Average approval cycle', value: '23 min', icon: Clock },
                { label: 'Automated pass-through rate', value: '74%', icon: Activity },
                { label: 'Compliance exceptions', value: '3 open', icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-cyan-200">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
