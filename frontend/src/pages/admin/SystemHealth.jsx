import React, { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Shield,
  Brain,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  GitBranch,
  Rocket,
  Bug,
  RefreshCw,
  Radio,
} from 'lucide-react';

const services = [
  { name: 'Core API', description: 'REST + GraphQL gateway', status: 'Operational', ping: '12ms', uptime: '99.98%', icon: Server },
  { name: 'Auth Service', description: 'AWS Cognito integration', status: 'Operational', ping: '8ms', uptime: '99.99%', icon: Shield },
  { name: 'ML Scoring Engine', description: 'Risk assessment & fraud detection', status: 'Operational', ping: '45ms', uptime: '99.94%', icon: Brain },
  { name: 'Database Cluster', description: 'DynamoDB primary + replicas', status: 'Operational', ping: '4ms', uptime: '99.99%', icon: Database },
  { name: 'Document Parser', description: 'OCR & invoice extraction', status: 'Degraded', ping: '210ms', uptime: '98.72%', icon: Zap },
  { name: 'Notification Service', description: 'Email, SMS & push delivery', status: 'Operational', ping: '18ms', uptime: '99.97%', icon: Radio },
  { name: 'CDN / Static Assets', description: 'CloudFront edge distribution', status: 'Operational', ping: '3ms', uptime: '100%', icon: Wifi },
  { name: 'Queue Processor', description: 'SQS event-driven workers', status: 'Operational', ping: '6ms', uptime: '99.96%', icon: Activity },
];

const statusConfig = (status) => {
  switch (status) {
    case 'Operational': return { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-400/20', icon: CheckCircle2, dot: 'bg-emerald-400' };
    case 'Degraded': return { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-400/20', icon: AlertTriangle, dot: 'bg-amber-400' };
    case 'Down': return { color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-400/20', icon: XCircle, dot: 'bg-rose-400' };
    default: return { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-400/20', icon: Clock, dot: 'bg-slate-400' };
  }
};

const events = [
  { type: 'deploy', title: 'v2.14.3 deployed to production', detail: 'ML Scoring Engine — model retrained with latest fraud patterns', time: '25 min ago', icon: Rocket, accent: 'text-blue-400' },
  { type: 'incident', title: 'Document Parser latency spike', detail: 'P95 latency exceeded 200ms threshold — investigating OCR provider', time: '1 hour ago', icon: AlertTriangle, accent: 'text-amber-400' },
  { type: 'deploy', title: 'v2.14.2 deployed to production', detail: 'Core API — added batch disbursement endpoint', time: '3 hours ago', icon: Rocket, accent: 'text-blue-400' },
  { type: 'fix', title: 'Auth token refresh race condition resolved', detail: 'Hotfix applied to Cognito session handler', time: '5 hours ago', icon: Bug, accent: 'text-emerald-400' },
  { type: 'deploy', title: 'v2.14.1 deployed to staging', detail: 'Notification Service — added WhatsApp Business API support', time: '8 hours ago', icon: GitBranch, accent: 'text-violet-400' },
  { type: 'incident', title: 'Scheduled maintenance completed', detail: 'Database cluster failover test — 0 downtime recorded', time: '12 hours ago', icon: Database, accent: 'text-cyan-400' },
];

export default function SystemHealth() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const operationalCount = services.filter((s) => s.status === 'Operational').length;
  const degradedCount = services.filter((s) => s.status === 'Degraded').length;

  const topMetrics = [
    { label: 'Services operational', value: `${operationalCount}/${services.length}`, delta: 'All systems monitored', icon: CheckCircle2, tone: 'from-emerald-500/20 to-emerald-400/5 text-emerald-100 border-emerald-400/15' },
    { label: 'Degraded services', value: String(degradedCount), delta: 'Requires attention', icon: AlertTriangle, tone: 'from-amber-500/20 to-amber-400/5 text-amber-100 border-amber-400/15' },
    { label: 'Avg API latency', value: '14ms', delta: 'P50 across all endpoints', icon: Activity, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
    { label: 'Platform uptime', value: '99.97%', delta: 'Last 30 days', icon: Wifi, tone: 'from-violet-500/20 to-violet-400/5 text-violet-100 border-violet-400/15' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              Infrastructure
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">System Health & Monitors</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Platform uptime, API latency, ML model performance, and service status monitoring.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </section>

      {/* Metrics */}
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

      {/* Service Grid */}
      <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Service status</h2>
          <p className="mt-1 text-sm text-slate-400">Real-time health of all platform microservices.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {services.map((svc) => {
            const cfg = statusConfig(svc.status);
            const StatusIcon = cfg.icon;
            const SvcIcon = svc.icon;
            return (
              <div key={svc.name} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-cyan-200">
                    <SvcIcon className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.border} ${cfg.bg} px-2.5 py-1 text-[11px] font-medium ${cfg.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${svc.status === 'Operational' ? 'animate-pulse' : ''}`} />
                    {svc.status}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-white">{svc.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{svc.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-slate-400">Ping: <span className="font-medium text-white">{svc.ping}</span></span>
                  <span className="text-xs text-slate-400">Uptime: <span className="font-medium text-white">{svc.uptime}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Recent events & deployments</h2>
          <p className="mt-1 text-sm text-slate-400">Timeline of system changes, incidents, and releases.</p>
        </div>
        <div className="space-y-3">
          {events.map((evt, idx) => {
            const EvtIcon = evt.icon;
            return (
              <div key={idx} className="flex items-start gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className={`mt-0.5 rounded-2xl border border-white/8 bg-white/[0.05] p-3 ${evt.accent}`}>
                  <EvtIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{evt.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{evt.detail}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500">{evt.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
