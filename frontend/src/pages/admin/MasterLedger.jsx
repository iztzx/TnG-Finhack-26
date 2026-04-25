import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  Banknote,
  Clock,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Send,
  ReceiptText,
  BadgeDollarSign,
  Layers,
} from 'lucide-react';

const mockBatches = [
  { id: 'BATCH-0091', smeCount: 5, totalAmount: 487500, status: 'Ready', createdAt: '15 min ago' },
  { id: 'BATCH-0090', smeCount: 3, totalAmount: 215000, status: 'Ready', createdAt: '1 hour ago' },
  { id: 'BATCH-0089', smeCount: 8, totalAmount: 892000, status: 'Processing', createdAt: '2 hours ago' },
  { id: 'BATCH-0088', smeCount: 2, totalAmount: 128750, status: 'Ready', createdAt: '3 hours ago' },
];

const mockTransactions = [
  { id: 'TXN-70294', type: 'disbursement', entity: 'Apex Trading Sdn Bhd', amount: 128500, timestamp: '2026-04-25 14:32', ref: 'INV-2026-1047' },
  { id: 'TXN-70293', type: 'repayment', entity: 'GreenLeaf Exports Pte Ltd', amount: 342000, timestamp: '2026-04-25 13:18', ref: 'INV-2026-0998' },
  { id: 'TXN-70292', type: 'disbursement', entity: 'Borneo Spice Co.', amount: 215000, timestamp: '2026-04-25 12:05', ref: 'INV-2026-1044' },
  { id: 'TXN-70291', type: 'fee', entity: 'Platform Service Fee', amount: 4750, timestamp: '2026-04-25 11:45', ref: 'FEE-AUTO-042' },
  { id: 'TXN-70290', type: 'repayment', entity: 'Pacific Rim Metals', amount: 450000, timestamp: '2026-04-25 10:22', ref: 'INV-2026-0965' },
  { id: 'TXN-70289', type: 'disbursement', entity: 'Sarawak Timber Works', amount: 178300, timestamp: '2026-04-25 09:50', ref: 'INV-2026-1040' },
  { id: 'TXN-70288', type: 'repayment', entity: 'Zenith Logistics MY', amount: 67200, timestamp: '2026-04-25 09:15', ref: 'INV-2026-0990' },
];

const batchStatusBadge = (status) => {
  switch (status) {
    case 'Ready': return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20';
    case 'Processing': return 'bg-amber-500/15 text-amber-300 border-amber-400/20';
    default: return 'bg-slate-500/15 text-slate-300 border-slate-400/20';
  }
};

const txnTypeConfig = (type) => {
  switch (type) {
    case 'disbursement': return { icon: ArrowUpRight, color: 'text-rose-400', label: 'Disbursement', sign: '-' };
    case 'repayment': return { icon: ArrowDownRight, color: 'text-emerald-400', label: 'Repayment', sign: '+' };
    case 'fee': return { icon: BadgeDollarSign, color: 'text-amber-400', label: 'Fee', sign: '-' };
    default: return { icon: ReceiptText, color: 'text-slate-400', label: type, sign: '' };
  }
};

export default function MasterLedger() {
  const [batches, setBatches] = useState(mockBatches);

  const handleRelease = (id) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Processing' } : b))
    );
  };

  const topMetrics = [
    { label: 'Vault balance', value: 'RM 8.2M', delta: 'Available for deployment', icon: Wallet, tone: 'from-emerald-500/20 to-emerald-400/5 text-emerald-100 border-emerald-400/15' },
    { label: 'Disbursed today', value: 'RM 521.8k', delta: '12 transactions settled', icon: Banknote, tone: 'from-blue-600/25 to-blue-400/5 text-blue-100 border-blue-400/15' },
    { label: 'Pending settlements', value: 'RM 1.72M', delta: '4 batches awaiting release', icon: Clock, tone: 'from-amber-500/20 to-amber-400/5 text-amber-100 border-amber-400/15' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,_rgba(15,23,42,0.88)_0%,_rgba(17,24,39,0.96)_50%,_rgba(3,105,161,0.55)_100%)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
            <Landmark className="h-3.5 w-3.5" />
            Treasury operations
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Finance & Treasury</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Treasury reports, disbursement batches, and master ledger reconciliation.
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

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Disbursement Batches */}
        <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Pending disbursement batches</h2>
            <p className="mt-1 text-sm text-slate-400">Approve and release payment batches to beneficiaries.</p>
          </div>
          <div className="space-y-3">
            {batches.map((batch) => (
              <div key={batch.id} className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-cyan-200">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{batch.id}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${batchStatusBadge(batch.status)}`}>
                      {batch.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{batch.smeCount} SMEs • Created {batch.createdAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">RM {batch.totalAmount.toLocaleString()}</p>
                </div>
                {batch.status === 'Ready' ? (
                  <button
                    onClick={() => handleRelease(batch.id)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Release
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    In progress
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ledger Transactions */}
        <div className="rounded-[32px] border border-white/8 bg-slate-950/45 p-6 shadow-sm backdrop-blur">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Recent ledger transactions</h2>
            <p className="mt-1 text-sm text-slate-400">Real-time transaction log across all treasury operations.</p>
          </div>
          <div className="space-y-3">
            {mockTransactions.map((txn) => {
              const config = txnTypeConfig(txn.type);
              const TxnIcon = config.icon;
              return (
                <div key={txn.id} className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                  <div className={`rounded-2xl border border-white/8 bg-white/[0.05] p-3 ${config.color}`}>
                    <TxnIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{txn.entity}</p>
                      <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-400">{config.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{txn.ref} • {txn.timestamp}</p>
                  </div>
                  <p className={`text-sm font-semibold ${config.color}`}>
                    {config.sign}RM {txn.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
