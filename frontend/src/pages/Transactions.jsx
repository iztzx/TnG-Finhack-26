import { useState, useEffect } from 'react';
import { Download, Filter, Calendar, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, CircleDollarSign, Clock3, BadgeCheck, ReceiptText, Wallet, Banknote, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listInvoices, getTransactionLedger, downloadReconciliation } from '../lib/api';

const filterOptions = ['ALL', 'FUNDED', 'REPAID', 'COMPLETED', 'PENDING_REVIEW', 'OFFER_MADE', 'ANALYZED'];

const statusColors = {
  FUNDED: 'bg-green-50 text-green-700',
  REPAID: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-700',
  OFFER_MADE: 'bg-purple-50 text-purple-700',
  ANALYZED: 'bg-gray-50 text-gray-700',
};

export default function Transactions() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [downloading, setDownloading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerError, setLedgerError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const userId = userProfile?.id || userProfile?.email || 'demo-user-001';

        // Fetch both invoices and real transaction ledger records in parallel
        const [invData, ledgerData] = await Promise.allSettled([
          listInvoices(userId),
          getTransactionLedger(userId),
        ]);

        // Map invoices
        const invoiceItems = invData.status === 'fulfilled' && invData.value?.invoices?.length > 0
          ? invData.value.invoices.map((inv) => ({
              id: inv.invoiceId,
              invoiceId: inv.invoiceId,
              vendorName: inv.vendorName,
              amount: inv.amount,
              totalFeeRate: inv.offerData?.totalFeeRate || 0,
              factoringFee: inv.offerData?.factoringFee || 0,
              netDisbursement: inv.offerData?.netDisbursement || 0,
              status: inv.status,
              invoiceDate: inv.invoiceDate,
              dueDate: inv.dueDate,
              source: 'invoice',
            }))
          : [];
        setInvoices(invoiceItems);

        // Map transaction ledger records
        const rawLedger = ledgerData.status === 'fulfilled' ? ledgerData.value : null;
        if (rawLedger?._error) {
          setLedgerError(rawLedger._errorMessage || 'Failed to load transaction ledger');
        } else {
          setLedgerError(null);
        }
        const ledgerItems = rawLedger?.transactions?.length > 0
          ? rawLedger.transactions.map((txn) => ({
              id: txn.id,
              transactionId: txn.id,
              invoiceId: txn.invoiceId || '',
              offerId: txn.offerId || '',
              amount: txn.amount || 0,
              netDisbursement: txn.amount || 0,
              currency: txn.currency || 'RM',
              status: txn.status || 'COMPLETED',
              type: txn.type || 'INVOICE_DISBURSEMENT',
              paymentMethod: txn.paymentMethod || '',
              createdAt: txn.createdAt || '',
              invoiceDate: txn.createdAt ? txn.createdAt.split('T')[0] : '',
              dueDate: '',
              vendorName: txn.type === 'INVOICE_DISBURSEMENT' ? 'Disbursement' : txn.type === 'CREDIT_SCORING' ? 'Credit Scoring' : txn.type.replace(/_/g, ' '),
              source: 'ledger',
            }))
          : [];
        setLedgerRows(ledgerItems);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();

    const handleRefresh = () => load();
    window.addEventListener('transactions:refresh', handleRefresh);
    return () => window.removeEventListener('transactions:refresh', handleRefresh);
  }, [userProfile?.id, userProfile?.email]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const isWithinDateRange = (dateStr) => {
    if (!dateStr || dateRange === 'Last 30 Days') return true;
    const date = new Date(dateStr).getTime();
    if (Number.isNaN(date)) return true;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    switch (dateRange) {
      case 'Today':
        return now - date < oneDay;
      case 'Last 7 Days':
        return now - date < 7 * oneDay;
      case 'This Month':
        return new Date().getMonth() === new Date(dateStr).getMonth() && new Date().getFullYear() === new Date(dateStr).getFullYear();
      case 'This Year':
        return new Date().getFullYear() === new Date(dateStr).getFullYear();
      default:
        return true;
    }
  };

  // Merge invoice rows and ledger rows, deduplicating by id/invoiceId
  // Ledger records (real disbursement transactions) take priority for the same invoiceId
  const allRows = (() => {
    const seen = new Set();
    const merged = [];
    // Add ledger rows first (they're real transaction records)
    for (const row of ledgerRows) {
      if (row.invoiceId) seen.add(row.invoiceId);
      merged.push(row);
    }
    // Add invoice rows that aren't already represented by a ledger row
    for (const inv of invoices) {
      if (!seen.has(inv.invoiceId)) {
        merged.push(inv);
      }
    }
    return merged;
  })();

  const filtered = allRows
    .filter((row) => filter === 'ALL' || row.status === filter)
    .filter((row) => isWithinDateRange(row.invoiceDate || row.createdAt))
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const completedInvoices = invoices.filter((i) => i.status === 'REPAID').length;
  const totalDisbursed = invoices.filter((i) => i.status === 'FUNDED' || i.status === 'REPAID').reduce((sum, i) => sum + (i.netDisbursement || 0), 0);
  // Use ledger amount when available (source of truth), fall back to invoice-derived amount
  const totalAdvanced = ledgerRows.length > 0
    ? ledgerRows.reduce((sum, t) => sum + (t.netDisbursement || 0), 0)
    : totalDisbursed;
  const pendingRepayments = invoices.filter((i) => i.status === 'FUNDED').reduce((sum, i) => sum + (i.amount || 0), 0);
  const averageAdvanceRate = invoices.length
    ? invoices.reduce((sum, i) => sum + (((i.netDisbursement || 0) / Math.max(i.amount || 1, 1)) * 100), 0) / invoices.length
    : 0;
  const walletBalance = userProfile?.walletBalance ?? 0;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const data = await downloadReconciliation();
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tng_statement.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      const csv = [
        ['Invoice ID', 'Vendor', 'Invoice Amount (RM)', 'Advanced To You (RM)', 'Status', 'Date'].join(','),
        ...invoices.map((i) => [i.invoiceId, i.vendorName, i.amount, i.netDisbursement, i.status, i.invoiceDate].join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tng_statement.csv';
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
    { key: 'id', label: 'Ref ID' },
    { key: 'vendorName', label: 'Description' },
    { key: 'amount', label: 'Invoice Amount (RM)' },
    { key: 'netDisbursement', label: 'Advanced To You (RM)' },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Repayment Due' },
    { key: 'invoiceDate', label: 'Date' },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Transaction history</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Funding and repayment timeline</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This view is customer-safe: it focuses on invoice value, the amount advanced to your business, repayment timing, and current status.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Generating...' : 'Download statement'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Wallet Balance</p>
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">RM {Number(walletBalance).toLocaleString()}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total advanced</p>
            <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">RM {totalAdvanced.toLocaleString()}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Outstanding repayment</p>
            <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">RM {pendingRepayments.toLocaleString()}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Settled invoices</p>
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">{completedInvoices}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Average advance rate</p>
            <div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">{averageAdvanceRate.toFixed(1)}%</p>
        </div>
      </div>

      {ledgerError && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Transaction ledger unavailable: {ledgerError} Showing invoice-based records only.</span>
        </div>
      )}

      <div className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === opt
                      ? 'bg-tng-blue text-white shadow-sm'
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h.key}
                    className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {headers.map((h) => (
                      <td key={h.key} className="px-4 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filtered.map((row) => (
                  <tr key={row.id || row.invoiceId} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${row.source === 'ledger' ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-4 py-4 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {row.source === 'ledger' && <Banknote className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        <span>{row.transactionId || row.invoiceId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">{row.vendorName}</td>
                    <td className="px-4 py-4 text-slate-700">RM {row.amount.toLocaleString()}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">RM {row.netDisbursement.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || 'bg-gray-50 text-gray-700'}`}>
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{row.dueDate || '—'}</td>
                    <td className="px-4 py-4 text-slate-500">{row.invoiceDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No transactions match the selected filter.</p>
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="mt-4 px-4 py-2 bg-tng-blue/10 text-tng-blue rounded-lg text-sm font-medium hover:bg-tng-blue/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">Platform revenue metrics are intentionally excluded from the SME portal to avoid cross-role leakage.</p>
      </div>
    </div>
  );
}
