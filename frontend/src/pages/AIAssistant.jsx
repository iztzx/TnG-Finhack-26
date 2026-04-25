import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { queryAIAssistant } from '../lib/api';

const smartResponses = {
  'what\'s my factoring rate': 'Based on your credit score of 780, your current rate is 3%. This includes a 2% base rate and 1% risk premium.',
  'what is my factoring rate': 'Based on your credit score of 780, your current rate is 3%. This includes a 2% base rate and 1% risk premium.',
  'how does invoice financing work': 'It\'s simple: 1) Upload your invoice, 2) Our AI analyzes fraud risk and credit score in seconds, 3) You get an instant offer (up to 95% advance), 4) Accept and funds hit your TNG Wallet instantly. The factoring fee (1-5%) is deducted from the advance. Your buyer repays TnG on the due date.',
  'what fees do i pay': 'You pay a one-time factoring fee per invoice, typically 1-5% of the invoice amount. This fee is deducted upfront from your advance. For example, on a RM 10,000 invoice with a 3% fee, you receive RM 9,200 instantly (after the 95% advance and fee deduction). There are no hidden charges or monthly fees.',
  'am i eligible': 'Eligibility criteria for Malaysian SMEs:\n• Registered business in Malaysia (SSM)\n• Minimum 12 months operating history\n• Monthly revenue of at least RM 10,000\n• Valid trade invoices or shipment documents\n• TNG e-wallet account for disbursement\n\nYour current credit score of 780 qualifies you for our best rates!',
  'how long does disbursement take': 'Once you accept an offer, funds are disbursed to your TNG Wallet within seconds. The entire process from upload to cash in hand takes under 3 minutes.',
  'what is shipment financing': 'Shipment financing lets you get up to 85% of your shipment value before delivery. We verify your shipment via satellite imagery, shipping partner location APIs, and customs data. Once verified, you receive the advance just like invoice financing.',
};

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm your TnG financing assistant. I can help you understand fees, check eligibility, or explain your credit score. What would you like to know?",
};

function getLocalResponse(input) {
  const lower = input.toLowerCase().trim();
  for (const [key, value] of Object.entries(smartResponses)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

async function getResponse(input, history) {
  // Try backend AI first
  try {
    const result = await queryAIAssistant(input, history);
    if (result?.reply) return result.reply;
  } catch {
    // fall through to local
  }
  // Fallback to local keyword matching
  return getLocalResponse(input) || "I'll connect you with our team for that. In the meantime, try uploading an invoice to see your instant offer!";
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Build history for context
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const reply = await getResponse(userMsg.text, history);
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

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">Your personal trade finance guide</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tng-blue/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-tng-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">TnG Financing Assistant</p>
            <p className="text-xs text-gray-500">Powered by AI · Typically replies instantly</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
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
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-tng-blue text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.text}
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
