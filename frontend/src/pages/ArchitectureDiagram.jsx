import { ArrowRight, BrainCircuit, Database, FileSearch, MapPinned, Satellite, ShieldCheck, Truck, Wallet } from 'lucide-react';

const stages = [
  {
    title: 'Business Inputs',
    icon: FileSearch,
    tone: 'bg-blue-50 text-blue-700',
    description: 'Invoices, shipment references, customs events, and buyer-facing trade documents enter the platform.',
    details: ['Invoice OCR and field extraction', 'Shipment reference lookup', 'Document validation and fraud checks'],
  },
  {
    title: 'Verification Layer',
    icon: Satellite,
    tone: 'bg-emerald-50 text-emerald-700',
    description: 'Shipment confidence is built from satellite imagery, shipping partner location APIs, and customs milestones.',
    details: ['Satellite scene confirmation', 'Partner API waypoint verification', 'Cross-check against customs release status'],
  },
  {
    title: 'Decisioning',
    icon: BrainCircuit,
    tone: 'bg-violet-50 text-violet-700',
    description: 'Risk models score invoice quality, route integrity, and repayment likelihood to generate funding terms.',
    details: ['Credit and repayment scoring', 'Route integrity risk scoring', 'Offer generation and approval rules'],
  },
  {
    title: 'Funding & Controls',
    icon: Wallet,
    tone: 'bg-amber-50 text-amber-700',
    description: 'Treasury, audit logging, repayments, and operator controls keep the platform production-ready.',
    details: ['Disbursement controls', 'Repayment scheduling', 'Audit and compliance logging'],
  },
];

const dataSources = [
  { label: 'Satellite imagery provider', icon: Satellite, status: 'Imagery updates every verification cycle' },
  { label: 'Shipping partner location API', icon: MapPinned, status: 'Carrier-grade waypoint events' },
  { label: 'Trade workflow engine', icon: Truck, status: 'Shipment and invoice orchestration' },
  { label: 'Secure data store', icon: Database, status: 'Encrypted audit and transaction records' },
];

export default function ArchitectureDiagram() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-sm backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">System design</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">How financing, tracking, and controls work together</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          This architecture reflects the current product story: shipment tracking is validated with satellite imagery and shipping partner location APIs,
          then combined with document intelligence and risk scoring to drive real financing decisions.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.title} className="relative rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className={`inline-flex rounded-2xl p-3 ${stage.tone}`}>
              <stage.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{stage.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{stage.description}</p>
            <div className="mt-4 space-y-2">
              {stage.details.map((detail) => (
                <div key={detail} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {detail}
                </div>
              ))}
            </div>
            {index < stages.length - 1 && (
              <div className="mt-5 hidden xl:flex items-center text-slate-300">
                <ArrowRight className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-tng-blue" />
            <h2 className="text-lg font-semibold text-slate-900">Real-world data sources</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dataSources.map((source) => (
              <button key={source.label} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5 text-left hover:bg-slate-50">
                <source.icon className="h-5 w-5 text-slate-700" />
                <p className="mt-3 text-sm font-semibold text-slate-900">{source.label}</p>
                <p className="mt-2 text-sm text-slate-500">{source.status}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">What this page clarifies</h2>
          <div className="mt-5 space-y-3">
            {[
              'Shipment tracking is framed around satellite evidence and partner location feeds rather than dedicated hardware devices.',
              'Route verification is explained using satellite imagery plus partner API location events.',
              'Admin and user experiences consume the same trusted operational backbone from different views.',
              'Funding controls, audit logs, and compliance remain part of the system without muddying the user story.',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
