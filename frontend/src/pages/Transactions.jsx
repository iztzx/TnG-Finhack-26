import { useState, useEffect } from 'react';
import { Download, Filter, Calendar, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { listInvoices, downloadReconciliation } from '../lib/api';

const filterOptions = ['ALL', 'FUNDED', 'REPAID', 'PENDING_REVIEW', 'OFFER_MADE', 'ANALYZED'];

const mockInvoices = [
  { invoiceId: 'INV-98234', vendorName: 'Syarikat ABC Sdn Bhd', amount: 15000, totalFeeRate: 0.03, factoringFee: 450, netDisbursement: 13800, status: 'FUNDED', invoiceDate: '2026-04-20', dueDate: '2026-05-15' },
  { invoiceId: 'INV-77102', vendorName: 'Mega Logistics Malaysia', amount: 25000, totalFeeRate: 0.025, factoringFee: 625, netDisbursement: 23000, status: 'REPAID', invoiceDate: '2026-03-15', dueDate: '2026-04-15' },
  { invoiceId: 'INV-88341', vendorName: 'Penang Electronics Sdn Bhd', amount: 42000, totalFeeRate: 0.035, factoringFee: 1470, netDisbursement: 38430, status: 'FUNDED', invoiceDate: '2026-04-18', dueDate: '2026-05-20' },
  { invoiceId: 'INV-55219', vendorName: 'Kuala Lumpur Textiles', amount: 8500, totalFeeRate: 0.03, factoringFee: 255, netDisbursement: 7820, status: 'PENDING_REVIEW', invoiceDate: '2026-04-22', dueDate: '2026-05-22' },
  { invoiceId: 'INV-33901', vendorName: 'Johor Bahru Manufacturing Co', amount: 67000, totalFeeRate: 0.02, factoringFee: 1340, netDisbursement: 62320, status: 'OFFER_MADE', invoiceDate: '2026-04-10', dueDate: '2026-05-10' },
  { invoiceId: 'INV-11287', vendorName: 'Selangor Fresh Produce Sdn Bhd', amount: 12000, totalFeeRate: 0.03, factoringFee: 360, netDisbursement: 11040, status: 'REPAID', invoiceDate: '2026-02-20', dueDate: '2026-03-20' },
  { invoiceId: 'INV-44512', vendorName: 'Sabah Timber Exports', amount: 34000, totalFeeRate: 0.028, factoringFee: 952, netDisbursement: 31248, status: 'FUNDED', invoiceDate: '2026-04-05', dueDate: '2026-05-05' },
  { invoiceId: 'INV-66783', vendorName: 'Sarawak Seafood Trading', amount: 18500, totalFeeRate: 0.032, factoringFee: 592, netDisbursement: 16963, status: 'ANALYZED', invoiceDate: '2026-04-21', dueDate: '2026-05-21' },
];

const statusColors = {
  FUNDED: 'bg-green-50 text-green-700',
  REPAID: 'bg-blue-50 text-blue-700',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-700',
  OFFER_MADE: 'bg-purple-50 text-purple-700',
  ANALYZED: 'bg-gray-50 text-gray-700',
};

export default function Transactions() {
  const [filter, setFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [downloading, setDownloading] = useState(false);
  const [invoices, setInvoices] = useState(mockInvoices);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    async function load() {
      try {
        const data = await listInvoices();
        if (data?.invoices?.length > 0) {
          const mapped = data.invoices.map((inv) => ({
            invoiceId: inv.invoiceId,
            vendorName: inv.vendorName,
            amount: inv.amount,
            totalFeeRate: inv.offerData?.totalFeeRate || 0,
            factoringFee: inv.offerData?.factoringFee || 0,
            netDisbursement: inv.offerData?.netDisbursement || 0,
            status: inv.status,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
          }));
          setInvoices(mapped);
        }
      } catch {
        // keep mock data
      }
    }
    load();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = invoices
    .filter((inv) => filter === 'ALL' || inv.status === filter)
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalDisbursed = invoices.filter((i) => i.status === 'FUNDED' || i.status === 'REPAID').reduce((sum, i) => sum + (i.netDisbursement || 0), 0);
  const totalFees = invoices.filter((i) => i.status === 'FUNDED' || i.status === 'REPAID').reduce((sum, i) => sum + (i.factoringFee || 0), 0);
  const pendingRepayments = invoices.filter((i) => i.status === 'FUNDED').reduce((sum, i) => sum + (i.amount || 0), 0);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const data = await downloadReconciliation();
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tng_reconciliation.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: create a simple CSV
      const csv = [
        ['Invoice ID', 'Vendor', 'Amount (RM)', 'Factoring Fee (RM)', 'Disbursed (RM)', 'Status', 'Date'].join(','),
        ...invoices.map((i) => [i.invoiceId, i.vendorName, i.amount, i.factoringFee, i.netDisbursement, i.status, i.invoiceDate].join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tng_reconciliation.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-tng-blue" />
      : <ArrowDown className="w-3 h-3 text-tng-blue" />;
  };

  const headers = [
    { key: 'invoiceId', label: 'Invoice ID' },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'amount', label: 'Amount (RM)' },
    { key: 'factoringFee', label: 'Factoring Fee (RM)' },
    { key: 'netDisbursement', label: 'Disbursed (RM)' },
    { key: 'status', label: 'Status' },
    { key: 'invoiceDate', label: 'Date' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions & Ledger</h1>
        <p className="text-sm text-gray-500 mt-1">Invoice financing history, fees, and disbursements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Disbursed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">RM {totalDisbursed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Fees Earned</p>
          <p className="text-2xl font-bold text-tng-gold mt-1">RM {totalFees.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Pending Repayments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">RM {pendingRepayments.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt
                      ? 'bg-tng-blue text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt === 'ALL' ? 'All' : opt.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
            >
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
              {filtered.map((row) => (
                <tr key={row.invoiceId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-600">{row.invoiceId}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.vendorName}</td>
                  <td className="px-4 py-3 text-gray-700">RM {row.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">RM {row.factoringFee.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">RM {row.netDisbursement.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || 'bg-gray-50 text-gray-700'}`}>
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.invoiceDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No transactions match the selected filter.</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Generating...' : 'Download Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
