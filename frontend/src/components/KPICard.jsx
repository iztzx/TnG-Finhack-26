import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

export default function KPICard({ icon: Icon, title, value, trend, trendUp, onClick, hint }) {
  const classes = "rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-md";

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="rounded-2xl bg-tng-blue/10 p-3">
          <Icon className="h-6 w-6 text-tng-blue" />
        </div>
        <div className="flex items-center gap-2">
          {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${trendUp ? 'bg-emerald-50 text-risk-low' : 'bg-rose-50 text-risk-high'}`}>
            {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{trend}%</span>
          </div>
          )}
          {onClick && <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${classes} text-left hover:-translate-y-0.5`}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
