import { useState, useEffect } from 'react';
import { GitBranch, Server, BookOpen, ClipboardList } from 'lucide-react';
import ComplianceBadge from '../components/ComplianceBadge';
import { getAuditTrail } from '../lib/api';

const regulations = [
  { code: 'PSA 2003', name: 'Payment Systems Act 2003', description: 'Governs payment systems and e-money issuance in Malaysia.', url: 'https://www.bnm.gov.my/documents/20124/1105151/psa_2003.pdf' },
  { code: 'PDPA 2010', name: 'Personal Data Protection Act 2010', description: 'Regulates processing of personal data in commercial transactions.', url: 'https://www.pdp.gov.my/jpdpv2/laws-of-malaysia-pdpa/personal-data-protection-act-2010/' },
  { code: 'BNM EPF', name: 'BNM E-Money Guidelines', description: 'Central Bank guidelines for electronic money issuers.', url: 'https://www.bnm.gov.my/documents/20124/1498064/Electronic+Money+%28E-Money%29.pdf' },
  { code: 'ISO 27001', name: 'ISO/IEC 27001:2022', description: 'Information security management systems standard.', url: 'https://www.iso.org/isoiec-27001-information-security.html' },
  { code: 'LHDN e-Inv', name: 'LHDN e-Invoice Guidelines', description: 'Malaysian Inland Revenue guidelines for electronic invoicing and tax compliance.', url: 'https://www.hasil.gov.my/en/e-invoice/' },
];

export default function ComplianceHub() {
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAuditTrail();
        if (data?.entries?.length > 0) {
          setAuditTrail(data.entries);
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Regulatory adherence and audit management for trade finance</p>
        </div>
        <ComplianceBadge />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-tng-blue" />
          <h2 className="text-lg font-semibold text-gray-900">Trade Finance Data Flow</h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 py-8">
          {[
            { label: 'SME Uploads Invoice', color: 'bg-blue-100 text-blue-700' },
            { label: 'TnG AI Scores Risk', color: 'bg-purple-100 text-purple-700' },
            { label: 'Licensed P2P Partner', color: 'bg-indigo-100 text-indigo-700' },
            { label: 'Lending Decision', color: 'bg-orange-100 text-orange-700' },
            { label: 'Funds Disbursed', color: 'bg-green-100 text-green-700' },
          ].map((node, i) => (
            <div key={node.label} className="flex items-center gap-4">
              <div className={`px-5 py-3 rounded-lg font-medium text-sm ${node.color}`}>
                {node.label}
              </div>
              {i < 4 && (
                <div className="w-8 h-0.5 bg-gray-300" />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500">
          TnG acts as the data oracle — NOT the lender. All lending decisions are made by licensed P2P financing partners regulated by BNM.
          All data flows encrypted in transit and at rest. PII tokenized before risk scoring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-tng-blue" />
            <h2 className="text-lg font-semibold text-gray-900">Data Residency</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Primary Region</span>
              <span className="text-sm font-bold text-green-700">Malaysia (MY)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Backup Region</span>
              <span className="text-sm font-bold text-gray-700">Singapore (SG)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Encryption Standard</span>
              <span className="text-sm font-bold text-gray-700">AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Retention Period</span>
              <span className="text-sm font-bold text-gray-700">7 Years</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-tng-blue" />
            <h2 className="text-lg font-semibold text-gray-900">Regulatory References</h2>
          </div>
          <div className="space-y-3">
            {regulations.map((reg) => (
              <a key={reg.code} href={reg.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg border border-gray-100 hover:border-tng-blue/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-tng-blue/10 text-tng-blue rounded text-xs font-bold">{reg.code}</span>
                  <span className="text-sm font-medium text-gray-900">{reg.name}</span>
                </div>
                <p className="text-xs text-gray-500">{reg.description}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-tng-blue" />
          <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-20" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-12" /></td>
                  </tr>
                ))
              ) : auditTrail.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No audit entries available.
                  </td>
                </tr>
              ) : (
                auditTrail.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-gray-600">{row.id}</td>
                    <td className="px-4 py-3 text-gray-900">{row.action}</td>
                    <td className="px-4 py-3 text-gray-600">{row.user}</td>
                    <td className="px-4 py-3 text-gray-500">{row.timestamp}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        row.severity === 'Info' ? 'bg-blue-50 text-blue-700' :
                        row.severity === 'Warning' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
