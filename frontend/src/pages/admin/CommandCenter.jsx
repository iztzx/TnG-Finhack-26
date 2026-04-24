import React from 'react';
import { Activity, CreditCard, AlertCircle, Clock, FileText, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';

export default function CommandCenter() {
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-400 text-sm">Real-time overview of platform activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><FileText size={24}/></div>
            <div>
              <p className="text-sm text-gray-400">Total Invoices</p>
              <h3 className="text-2xl font-bold text-white">142</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-400 flex items-center gap-1"><TrendingUp size={16}/> +12% from yesterday</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><CreditCard size={24}/></div>
            <div>
              <p className="text-sm text-gray-400">Active Deals</p>
              <h3 className="text-2xl font-bold text-white">RM 4.2M</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-green-400 flex items-center gap-1"><TrendingUp size={16}/> RM 350k disbursed today</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-red-500/50 transition-all hover:shadow-lg hover:shadow-red-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><AlertCircle size={24}/></div>
            <div>
              <p className="text-sm text-gray-400">Overdue Repayments</p>
              <h3 className="text-2xl font-bold text-white">RM 85k</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-red-400 flex items-center gap-1">2 deals require attention</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg"><Clock size={24}/></div>
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <h3 className="text-2xl font-bold text-white">18</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400 flex items-center gap-1">Invoices awaiting approval</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity Feed</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-700 last:border-0 hover:bg-gray-700/30 p-2 rounded-lg transition-colors">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-full mt-1">
                  <Activity size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">Invoice #INV-2025-{1000+i} approved by <span className="font-semibold text-blue-400">Finance Manager</span></p>
                  <p className="text-xs text-gray-500 mt-1">{i * 10} minutes ago • ID: 89f2c{i}</p>
                </div>
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Approved</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all hover:scale-105">
              <span className="font-medium">Review Pending Invoices</span>
              <span className="bg-white/20 px-2 py-1 rounded text-xs">18</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all hover:scale-105">
              <span className="font-medium">Approve Deals</span>
              <span className="bg-black/20 px-2 py-1 rounded text-xs">5</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all hover:scale-105">
              <span className="font-medium">Flag Fraud Alerts</span>
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">1</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all hover:scale-105">
              <span className="font-medium">Generate Reports</span>
              <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
