import React, { useState } from 'react';
import {
  ShieldAlert,
  FileWarning,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';

const mockInvoices = [
  { id: 'INV-2026-1047', sme: 'Apex Trading Sdn Bhd', amount: 128500, riskScore: 87, aiRec: 'Approve with conditions', status: 'pending', submittedAt: '2 hours ago' },
  { id: 'INV-2026-1046', sme: 'GreenLeaf Exports Pte Ltd', amount: 342000, riskScore: 34, aiRec: 'Auto-approve', status: 'pending', submittedAt: '3 hours ago' },
  { id: 'INV-2026-1045', sme: 'MalayTech Solutions', amount: 89750, riskScore: 92, aiRec: 'Escalate to compliance', status: 'pending', submittedAt: '4 hours ago' },
  { id: 'INV-2026-1044', sme: 'Borneo Spice Co.', amount: 215000, riskScore: 56, aiRec: 'Approve', status: 'pending', submittedAt: '5 hours ago' },
  { id: 'INV-2026-1043', sme: 'Zenith Logistics MY', amount: 67200, riskScore: 71, aiRec: 'Manual review required', status: 'pending', submittedAt: '5 hours ago' },
  { id: 'INV-2026-1042', sme: 'Pacific Rim Metals', amount: 450000, riskScore: 15, aiRec: 'Auto-approve', status: 'pending', submittedAt: '6 hours ago' },
  { id: 'INV-2026-1041', sme: 'KL Freight Hub', amount: 178300, riskScore: 63, aiRec: 'Approve with conditions', status: 'pending', submittedAt: '7 hours ago' },
];

const getRiskColor = (score) => {
  if (score >= 80) return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-400/20' };
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-400/20' };
  if (score >= 40) return { text: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-400/20' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-400/20' };
};

const getRecBadge = (rec) => {
  if (rec.includes('Auto-approve')) return 'bg-emerald-500/15 text-emerald-300';
  if (rec.includes('Escalate')) return 'bg-rose-500/15 text-rose-300';
  if (rec.includes('conditions')) return 'bg-amber-500/15 text-amber-300';
  return 'bg-violet-500/15 text-violet-300';
};

export default function ReviewQueue() {
  const [invoices, setInvoices] = useState(mockInvoices);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.sme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = (id, action) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const topMetrics = [
    { label: 'Pending invoices', value: String(invoices.length), delta: 'Awaiting operator review', icon: FileWarning, tone: 'from-amber-500/20 to-amber-400/5 text-amber-100 border-amber-400/15' },
    { label: 'High risk alerts', value: String(invoices.filter((i) => i.riskScore >= 80).length), delta: 'Score ≥ 80 threshold', icon: AlertTriangle, tone: 'from-rose-500/20 to-rose-400/5 text-rose-100 border-rose-400/15' },
    { label: 'Avg review time', value: '18 min', delta: 'Last 24h average', icon: Clock, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
            <ShieldAlert className="h-3.5 w-3.5" />
            Compliance queue
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Risk & Compliance Queue</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Pending invoice reviews and risk assessments requiring manual operator intervention.
          </p>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      {/* Invoice Queue */}
      <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Invoice review queue</h2>
            <p className="mt-1 text-sm text-slate-400">Approve, reject, or escalate pending submissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SME or invoice…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const risk = getRiskColor(inv.riskScore);
            return (
              <div key={inv.id} className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05] lg:flex-row lg:items-center">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{inv.sme}</p>
                    <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">{inv.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Submitted {inv.submittedAt}</p>
                </div>

                {/* Amount */}
                <div className="text-left lg:w-32 lg:text-right">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Amount</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">RM {inv.amount.toLocaleString()}</p>
                </div>

                {/* Risk Score */}
                <div className="lg:w-24 lg:text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Risk</p>
                  <span className={`mt-0.5 inline-flex items-center rounded-full border ${risk.border} ${risk.bg} px-2.5 py-1 text-xs font-semibold ${risk.text}`}>
                    {inv.riskScore}/100
                  </span>
                </div>

                {/* AI Recommendation */}
                <div className="lg:w-44">
                  <p className="text-xs uppercase tracking-wider text-slate-500">AI Recommendation</p>
                  <span className={`mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getRecBadge(inv.aiRec)}`}>
                    {inv.aiRec}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 lg:w-auto">
                  <button
                    onClick={() => handleAction(inv.id, 'approve')}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(inv.id, 'reject')}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600/80 px-3 py-2 text-xs font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-rose-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(inv.id, 'escalate')}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-transform hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Escalate
                  </button>
                </div>
              </div>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/8 bg-white/[0.03] py-12">
              <CheckCircle2 className="h-10 w-10 text-emerald-400/50" />
              <p className="mt-3 text-sm font-medium text-slate-300">Queue is clear</p>
              <p className="mt-1 text-xs text-slate-500">All invoices have been processed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
