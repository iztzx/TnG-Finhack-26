import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  TrendingUp,
  Shield,
  User,
  Globe,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogIn,
  Trash2,
  Edit3,
  Eye,
  Download,
} from 'lucide-react';

const mockAuditEntries = [
  { id: 'AUD-90012', timestamp: '2026-04-25 14:32:18', actor: 'ahmad.razak@tng.com.my', actorType: 'admin', action: 'Invoice Approved', target: 'Invoice #INV-2026-1047', ip: '103.28.212.45', severity: 'info' },
  { id: 'AUD-90011', timestamp: '2026-04-25 14:18:05', actor: 'System — ML Pipeline', actorType: 'system', action: 'Risk Score Generated', target: 'Invoice #INV-2026-1048', ip: '10.0.4.22', severity: 'info' },
  { id: 'AUD-90010', timestamp: '2026-04-25 13:55:42', actor: 'sarah.lim@tng.com.my', actorType: 'admin', action: 'Disbursement Batch Released', target: 'Batch #BATCH-0089', ip: '103.28.212.51', severity: 'warning' },
  { id: 'AUD-90009', timestamp: '2026-04-25 13:42:10', actor: 'System — Auth Service', actorType: 'system', action: 'Failed Login Attempt', target: 'User ops-admin@tng.com.my', ip: '185.220.101.34', severity: 'critical' },
  { id: 'AUD-90008', timestamp: '2026-04-25 13:20:33', actor: 'ahmad.razak@tng.com.my', actorType: 'admin', action: 'KYC Status Updated', target: 'SME — Zenith Logistics MY', ip: '103.28.212.45', severity: 'info' },
  { id: 'AUD-90007', timestamp: '2026-04-25 12:58:17', actor: 'System — Scheduler', actorType: 'system', action: 'Automated Report Generated', target: 'Daily Treasury Summary', ip: '10.0.4.10', severity: 'info' },
  { id: 'AUD-90006', timestamp: '2026-04-25 12:45:09', actor: 'sarah.lim@tng.com.my', actorType: 'admin', action: 'Invoice Escalated', target: 'Invoice #INV-2026-1045', ip: '103.28.212.51', severity: 'warning' },
  { id: 'AUD-90005', timestamp: '2026-04-25 12:30:22', actor: 'ahmad.razak@tng.com.my', actorType: 'admin', action: 'SME Profile Viewed', target: 'SME — Apex Trading Sdn Bhd', ip: '103.28.212.45', severity: 'info' },
  { id: 'AUD-90004', timestamp: '2026-04-25 11:15:48', actor: 'System — Fraud Engine', actorType: 'system', action: 'Anomaly Detected', target: 'Invoice #INV-2026-1039', ip: '10.0.4.22', severity: 'critical' },
  { id: 'AUD-90003', timestamp: '2026-04-25 10:50:31', actor: 'ops-admin@tng.com.my', actorType: 'admin', action: 'System Config Updated', target: 'Risk Threshold — High ≥ 80', ip: '103.28.212.60', severity: 'warning' },
  { id: 'AUD-90002', timestamp: '2026-04-25 10:22:14', actor: 'System — Treasury', actorType: 'system', action: 'Repayment Received', target: 'Invoice #INV-2026-0965', ip: '10.0.4.15', severity: 'info' },
  { id: 'AUD-90001', timestamp: '2026-04-25 09:45:07', actor: 'ahmad.razak@tng.com.my', actorType: 'admin', action: 'Admin Session Started', target: 'Command Center', ip: '103.28.212.45', severity: 'info' },
];

const actionIcons = {
  'Invoice Approved': CheckCircle2,
  'Risk Score Generated': Shield,
  'Disbursement Batch Released': Download,
  'Failed Login Attempt': LogIn,
  'KYC Status Updated': Edit3,
  'Automated Report Generated': FileText,
  'Invoice Escalated': AlertCircle,
  'SME Profile Viewed': Eye,
  'Anomaly Detected': AlertCircle,
  'System Config Updated': Settings,
  'Repayment Received': CheckCircle2,
  'Admin Session Started': LogIn,
};

const severityConfig = {
  info: { badge: 'bg-blue-500/15 text-blue-300 border-blue-400/20', dot: 'bg-blue-400' },
  warning: { badge: 'bg-amber-500/15 text-amber-300 border-amber-400/20', dot: 'bg-amber-400' },
  critical: { badge: 'bg-rose-500/15 text-rose-300 border-rose-400/20', dot: 'bg-rose-400' },
};

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filtered = mockAuditEntries.filter((entry) => {
    const matchesSearch =
      entry.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || entry.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const totalEvents = mockAuditEntries.length;
  const criticalCount = mockAuditEntries.filter((e) => e.severity === 'critical').length;
  const adminActions = mockAuditEntries.filter((e) => e.actorType === 'admin').length;

  const topMetrics = [
    { label: 'Total events today', value: String(totalEvents), delta: 'All recorded actions', icon: ScrollText, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
    { label: 'Critical events', value: String(criticalCount), delta: 'Requires investigation', icon: AlertCircle, tone: 'from-rose-500/20 to-rose-400/5 text-rose-100 border-rose-400/15' },
    { label: 'Operator actions', value: String(adminActions), delta: 'Manual interventions', icon: User, tone: 'from-violet-500/20 to-violet-400/5 text-violet-100 border-violet-400/15' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
            <ScrollText className="h-3.5 w-3.5" />
            Audit trail
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Global Audit Trail</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Immutable audit log of all platform actions, system events, and operator decisions.
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

      {/* Audit Log Table */}
      <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Event log</h2>
            <p className="mt-1 text-sm text-slate-400">Searchable, immutable record of all platform activity.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search actor, action, target…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              {['all', 'info', 'warning', 'critical'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    severityFilter === sev
                      ? 'bg-blue-600 text-white'
                      : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
              <Calendar className="h-4 w-4" />
              Date range
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {filtered.map((entry) => {
            const ActionIcon = actionIcons[entry.action] || FileText;
            const sev = severityConfig[entry.severity] || severityConfig.info;
            return (
              <div key={entry.id} className="flex flex-col gap-3 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05] lg:flex-row lg:items-center">
                {/* Severity dot + icon */}
                <div className="flex items-center gap-3 lg:w-10">
                  <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                  <ActionIcon className="h-4 w-4 text-slate-400 lg:hidden" />
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 lg:w-40">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-xs text-slate-400">{entry.timestamp}</span>
                </div>

                {/* Actor */}
                <div className="flex items-center gap-2 min-w-0 lg:w-56">
                  <div className={`rounded-lg p-1 ${entry.actorType === 'system' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-violet-500/10 text-violet-300'}`}>
                    {entry.actorType === 'system' ? <Settings className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  </div>
                  <span className="truncate text-xs text-slate-300">{entry.actor}</span>
                </div>

                {/* Action */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{entry.action}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${sev.badge}`}>
                      {entry.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{entry.target}</p>
                </div>

                {/* IP */}
                <div className="flex items-center gap-1.5 lg:w-32">
                  <Globe className="h-3 w-3 text-slate-600" />
                  <span className="font-mono text-[11px] text-slate-500">{entry.ip}</span>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/8 bg-white/[0.03] py-12">
              <Search className="h-10 w-10 text-slate-500/50" />
              <p className="mt-3 text-sm font-medium text-slate-300">No matching events</p>
              <p className="mt-1 text-xs text-slate-500">Adjust your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
