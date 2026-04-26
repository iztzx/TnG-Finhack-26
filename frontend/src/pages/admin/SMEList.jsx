import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Banknote,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
  Building2,
  Eye,
  BadgeCheck,
  Clock,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { getAdminSMEList } from '../../lib/api';

const kycBadge = (status) => {
  switch (status) {
    case 'Verified': return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20';
    case 'Pending': return 'bg-amber-500/15 text-amber-300 border-amber-400/20';
    case 'Under Review': return 'bg-violet-500/15 text-violet-300 border-violet-400/20';
    default: return 'bg-slate-500/15 text-slate-300 border-slate-400/20';
  }
};

const kycIcon = (status) => {
  switch (status) {
    case 'Verified': return BadgeCheck;
    case 'Pending': return Clock;
    case 'Under Review': return AlertCircle;
    default: return Clock;
  }
};

export default function SMEList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [smes, setSmes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminSMEList();
        if (data?.smes?.length > 0) {
          setSmes(data.smes);
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = smes.filter(
    (sme) =>
      sme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sme.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sme.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalActive = smes.filter((s) => s.kyc === 'Verified').length;
  const pendingKYC = smes.filter((s) => s.kyc !== 'Verified').length;
  const totalCapital = smes.reduce((sum, s) => sum + s.totalFinanced, 0);

  const topMetrics = [
    { label: 'Total active SMEs', value: String(totalActive), delta: 'KYC verified and onboarded', icon: UserCheck, tone: 'from-emerald-500/20 to-emerald-400/5 text-emerald-100 border-emerald-400/15' },
    { label: 'Pending KYC', value: String(pendingKYC), delta: 'Awaiting verification', icon: Clock, tone: 'from-amber-500/20 to-amber-400/5 text-amber-100 border-amber-400/15' },
    { label: 'Total capital deployed', value: `RM ${(totalCapital / 1000000).toFixed(1)}M`, delta: 'Cumulative across all SMEs', icon: Banknote, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
            <Users className="h-3.5 w-3.5" />
            SME directory
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">SME Management</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Manage registered SMEs, view onboarding status, and update risk profiles.
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

      {/* SME Table */}
      <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Registered SMEs</h2>
            <p className="mt-1 text-sm text-slate-400">{smes.length} organisations in directory</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SME, ID, or sector…"
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
          {filtered.map((sme) => {
            const KycIcon = kycIcon(sme.kyc);
            return (
              <div key={sme.id} className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05] lg:flex-row lg:items-center">
                {/* Company */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-cyan-200">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{sme.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{sme.sector} • {sme.id}</p>
                  </div>
                </div>

                {/* Registration Date */}
                <div className="flex items-center gap-1.5 lg:w-36">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">{sme.regDate}</span>
                </div>

                {/* KYC Status */}
                <div className="lg:w-32">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${kycBadge(sme.kyc)}`}>
                    <KycIcon className="h-3 w-3" />
                    {sme.kyc}
                  </span>
                </div>

                {/* Financed */}
                <div className="text-left lg:w-36 lg:text-right">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Financed</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    {sme.totalFinanced > 0 ? `RM ${sme.totalFinanced.toLocaleString()}` : '—'}
                  </p>
                </div>

                {/* Action */}
                <div className="lg:w-auto">
                  <button className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-500">
                    <Eye className="h-3.5 w-3.5" />
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
