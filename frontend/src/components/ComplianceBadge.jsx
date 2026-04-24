import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ComplianceBadge() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <ShieldCheck className="w-4 h-4" />
      <span>BNM Compliant</span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
          <p className="font-semibold mb-1">Bank Negara Malaysia Compliant</p>
          <p>Adheres to Payment Systems Act 2003, e-money guidelines, and data protection standards for financial services.</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
