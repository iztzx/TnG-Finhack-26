import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const sampleData = [
  { id: 'TXN-001', user: 'Ahmad Ibrahim', amount: 12500, riskScore: 320, status: 'Approved', date: '2026-04-24' },
  { id: 'TXN-002', user: 'Siti Nurhaliza', amount: 8700, riskScore: 450, status: 'Approved', date: '2026-04-24' },
  { id: 'TXN-003', user: 'Rajesh Kumar', amount: 23400, riskScore: 720, status: 'Pending Review', date: '2026-04-23' },
  { id: 'TXN-004', user: 'Lee Wei Ming', amount: 5600, riskScore: 180, status: 'Approved', date: '2026-04-23' },
  { id: 'TXN-005', user: 'Fatimah Abdullah', amount: 18900, riskScore: 680, status: 'Flagged', date: '2026-04-22' },
  { id: 'TXN-006', user: 'Chen Xiao Ling', amount: 9200, riskScore: 290, status: 'Approved', date: '2026-04-22' },
  { id: 'TXN-007', user: 'Muhammad Faiz', amount: 15600, riskScore: 510, status: 'Approved', date: '2026-04-21' },
  { id: 'TXN-008', user: 'Priya Sharma', amount: 34100, riskScore: 780, status: 'Rejected', date: '2026-04-21' },
];

const headers = [
  { key: 'id', label: 'ID' },
  { key: 'user', label: 'User' },
  { key: 'amount', label: 'Amount (RM)' },
  { key: 'riskScore', label: 'Risk Score' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

export default function TransactionTable({ data = sampleData }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Flagged': return 'bg-orange-100 text-orange-700';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-tng-blue" />
      : <ArrowDown className="w-3 h-3 text-tng-blue" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {headers.map((h) => (
              <th
                key={h.key}
                className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort(h.key)}
              >
                <div className="flex items-center gap-1">
                  {h.label}
                  <SortIcon columnKey={h.key} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-mono text-gray-600">{row.id}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{row.user}</td>
              <td className="px-4 py-3 text-gray-700">RM {row.amount.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  row.riskScore <= 500 ? 'bg-green-50 text-green-700' :
                  row.riskScore <= 700 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {row.riskScore}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
