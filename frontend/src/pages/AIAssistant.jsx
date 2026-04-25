import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, User, Bot, Sparkles, RefreshCw, Wallet, FileText,
  Truck, ShieldCheck, TrendingUp, Banknote, CircleDollarSign,
  Clock3, Activity,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import {
  queryAIAssistant,
  getExecutiveSummary,
  getDashboardData,
  listShipments,
  listInvoices,
  getTransactions,
  getAnalytics,
} from '../lib/api';

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm your **OUT&IN** financing assistant. I can help you understand fees, check eligibility, or explain your credit score. What would you like to know?",
};

async function getResponse(input, history, context) {
  const result = await queryAIAssistant(input, history, context);
  return result?.reply ?? "I'm sorry, I couldn't process that. Please try again or contact support.";
}

/* ── Helpers ─────────────────────────────────────────────── */

function formatCurrency(val) {
  const n = Number(val);
  if (!n || Number.isNaN(n)) return 'RM 0';
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  return `RM ${n.toLocaleString()}`;
}

function deriveKPIs(ctx) {
  const p = ctx.profile || {};
  const d = ctx.dashboard || {};
  const inv = ctx.invoices?.invoices || [];
  const shp = ctx.shipments?.shipments || [];

  const wallet = p.walletBalance ?? d.totalFinanced ?? 0;
  const creditLimit = p.creditLimit ?? 0;
  const totalFinanced = d.totalFinanced ?? 0;
  const totalRepaid = d.totalRepaid ?? 0;
  const activeInvoices = inv.filter((i) => i.status === 'FUNDED').length;
  const totalInvoices = inv.length;
  const fundedInvoices = inv.filter((i) => i.status === 'FUNDED' || i.status === 'REPAID');
  const totalDisbursed = fundedInvoices.reduce((s, i) => s + (i.offerData?.netDisbursement || i.amount || 0), 0);
  const activeShipments = shp.filter((s) => s.status === 'IN_TRANSIT').length;
  const deliveredShipments = shp.filter((s) => s.status === 'DELIVERED').length;
  const riskTier = p.riskTier || 'N/A';
  const kycStatus = p.kycStatus || 'Unknown';
  const avgFactoringRate = d.avgFactoringRate ?? 0;
  const utilizationRate = d.utilizationRate ?? 0;

  return {
    wallet,
    creditLimit,
    totalFinanced,
    totalRepaid,
    activeInvoices,
    totalInvoices,
    totalDisbursed,
    activeShipments,
    deliveredShipments,
    riskTier,
    kycStatus,
    avgFactoringRate,
    utilizationRate,
  };
}

/* ── Sub-components ──────────────────────────────────────── */

function SummaryCard({ icon: Icon, label, value, tone, sub }) {
  const bg = tone === 'blue' ? 'bg-blue-50' : tone === 'green' ? 'bg-emerald-50' : tone === 'amber' ? 'bg-amber-50' : tone === 'violet' ? 'bg-violet-50' : 'bg-slate-50';
  const ic = tone === 'blue' ? 'text-blue-600' : tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'violet' ? 'text-violet-600' : 'text-slate-600';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`rounded-xl p-2 ${bg}`}>
          <Icon className={`w-4 h-4 ${ic}`} />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

export default function AIAssistant() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [userContext, setUserContext] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // Fetch all user data and generate executive summary on mount
  useEffect(() => {
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const [dashboard, shipments, invoices, transactions, analytics] = await Promise.allSettled([
          getDashboardData(),
          listShipments(),
          listInvoices(),
          getTransactions(),
          getAnalytics(),
        ]);

        const context = {
          profile: userProfile || {},
          dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
          shipments: shipments.status === 'fulfilled' ? shipments.value : null,
          invoices: invoices.status === 'fulfilled' ? invoices.value : null,
          transactions: transactions.status === 'fulfilled' ? transactions.value : null,
          analytics: analytics.status === 'fulfilled' ? analytics.value : null,
        };

        setUserContext(context);

        const result = await getExecutiveSummary(context);
        if (result?.success && result.summary) {
          setSummary(result.summary);
        } else {
          setSummary('Unable to generate summary at this time. Please try again later.');
        }
      } catch (err) {
        console.warn('Failed to load executive summary:', err);
        setSummary('Unable to generate summary at this time.');
      } finally {
        setSummaryLoading(false);
      }
    }

    if (userProfile) {
      loadSummary();
    }
  }, [userProfile]);

  const kpis = useMemo(() => (userContext ? deriveKPIs(userContext) : null), [userContext]);

  const handleRegenerateSummary = async () => {
    if (!userContext) return;
    setSummaryLoading(true);
    try {
      const result = await getExecutiveSummary(userContext);
      if (result?.success && result.summary) {
        setSummary(result.summary);
      }
    } catch (err) {
      console.warn('Failed to regenerate summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const reply = await getResponse(userMsg.text, history, userContext);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const summaryCards = kpis ? [
    { icon: Wallet, label: 'Wallet', value: formatCurrency(kpis.wallet), tone: 'green', sub: `Credit limit ${formatCurrency(kpis.creditLimit)}` },
    { icon: Banknote, label: 'Total Advanced', value: formatCurrency(kpis.totalDisbursed || kpis.totalFinanced), tone: 'blue', sub: `Repaid ${formatCurrency(kpis.totalRepaid)}` },
    { icon: FileText, label: 'Invoices', value: `${kpis.activeInvoices} active`, tone: 'violet', sub: `${kpis.totalInvoices} total` },
    { icon: Truck, label: 'Shipments', value: `${kpis.activeShipments} in transit`, tone: 'amber', sub: `${kpis.deliveredShipments} delivered` },
    { icon: ShieldCheck, label: 'Risk Tier', value: kpis.riskTier, tone: kpis.riskTier === 'LOW' ? 'green' : kpis.riskTier === 'MEDIUM' ? 'amber' : 'blue', sub: `KYC ${kpis.kycStatus}` },
    { icon: TrendingUp, label: 'Funding Cost', value: `${(kpis.avgFactoringRate * 100).toFixed(1)}%`, tone: 'blue', sub: `${(kpis.utilizationRate * 100).toFixed(0)}% utilised` },
  ] : [];

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Karla', sans-serif" }}>AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">Your OUT&IN trade finance guide</p>
      </div>

      {/* Executive Summary: Hydrated KPI Cards + AI Analysis */}
      <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-tng-blue" />
            <h2 className="text-sm font-semibold text-slate-900">Executive Summary</h2>
          </div>
          <button
            onClick={handleRegenerateSummary}
            disabled={summaryLoading}
            className="text-xs text-tng-blue hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${summaryLoading ? 'animate-spin' : ''}`} />
            {summaryLoading ? 'Generating...' : 'Regenerate'}
          </button>
        </div>

        {/* Hydrated KPI Cards */}
        {summaryCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
            {summaryCards.map((c) => (
              <SummaryCard key={c.label} {...c} />
            ))}
          </div>
        )}

        {/* AI-generated text analysis */}
        {summaryLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/6" />
          </div>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none text-sm text-slate-700 leading-relaxed
            [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h1]:mt-3 [&_h1]:mb-1
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-2 [&_h3]:mb-1
            [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1
            [&_li]:my-0.5
            [&_strong]:text-slate-900 [&_strong]:font-semibold
            [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
            [&_pre]:bg-slate-50 [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto
          ">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tng-blue/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-tng-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">OUT&IN Financing Assistant</p>
            <p className="text-xs text-gray-500">Powered by Qwen AI · Alibaba Cloud</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-gray-100' : 'bg-tng-blue/10'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-tng-blue" />
                  )}
                </div>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-tng-blue text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose-chat
                      [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5
                      [&_strong]:font-semibold [&_strong]:text-gray-900
                      [&_code]:bg-gray-200/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                      [&_pre]:bg-gray-200/40 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:overflow-x-auto
                      [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1
                      [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-1 [&_h3]:mb-1
                    ">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-line">{msg.text}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-tng-blue/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-tng-blue" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about fees, eligibility, or your credit score..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              className="px-4 py-2.5 bg-tng-blue text-white rounded-xl hover:bg-tng-blue-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              "What's my factoring rate?",
              'How does invoice financing work?',
              'What fees do I pay?',
              'Am I eligible?',
              'Summarize my status',
            ].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors border border-gray-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
