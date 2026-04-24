export default function RiskGauge({ score = 650 }) {
  const normalized = Math.min(Math.max(score, 0), 850);
  const percentage = (normalized / 850) * 100;
  const rotation = (percentage / 100) * 180 - 90;

  let color = '#22c55e';
  if (normalized > 500) color = '#eab308';
  if (normalized > 700) color = '#ef4444';

  const getLabel = () => {
    if (normalized <= 500) return 'Low Risk';
    if (normalized <= 700) return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 251} 251`}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="6"
            fill="#374151"
          />
          <line
            x1="100"
            y1="100"
            x2={100 + 70 * Math.cos((rotation * Math.PI) / 180)}
            y2={100 + 70 * Math.sin((rotation * Math.PI) / 180)}
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
      </div>
      <div className="text-center mt-2">
        <p className="text-3xl font-bold text-gray-900">{normalized}</p>
        <p className="text-sm font-medium" style={{ color }}>
          {getLabel()}
        </p>
      </div>
    </div>
  );
}
