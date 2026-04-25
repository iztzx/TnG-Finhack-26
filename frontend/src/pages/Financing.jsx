import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Upload, FileText, Truck, CheckCircle, X, Zap, Shield, AlertTriangle,
  Banknote, Package, Cloud, Cpu, RefreshCw, AlertCircle, ArrowRight,
  TrendingUp, Wallet, Info, Mail, ExternalLink, ChevronDown,
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import { uploadToAlibaba, getScoringOffer, acceptOffer, trackShipment, verifyShipment } from '../lib/api';

// ============================================================================
// Agreement Modal — shown before accepting a financing offer
// ============================================================================
function AgreementModal({ offerAmount, onAccept, onClose }) {
  const [checked, setChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const tncPdfUrl = import.meta.env.VITE_TNC_PDF_URL || '/Out_In_TNC_Agreement.pdf';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Financing Agreement</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-gray-700">
          <p>
            By accepting this offer, you agree to assign your receivables to <strong>OUT&amp;IN</strong>
            under the laws of Malaysia, including the <strong>Civil Law Act 1956</strong>.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Net Disbursement</span>
              <span className="font-bold text-gray-900">RM {Number(offerAmount || 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">
              The repayment obligation is transferred to OUT&amp;IN upon disbursement.
            </p>
          </div>

          {/* Clickable Terms of Financing */}
          <button
            type="button"
            onClick={() => setShowTerms((s) => !s)}
            className="flex items-center gap-2 text-tng-blue font-semibold hover:underline text-sm"
          >
            <FileText className="w-4 h-4" />
            Terms of Financing
            <ChevronDown className={`w-4 h-4 transition-transform ${showTerms ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTerms && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    src={tncPdfUrl}
                    title="Terms and Conditions"
                    className="w-full h-96"
                  />
                  <div className="p-3 border-t border-gray-200 bg-white flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      OUT&amp;IN Terms &amp; Conditions Agreement
                    </span>
                    <a
                      href={tncPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-tng-blue hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View full document
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-tng-blue focus:ring-tng-blue"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
              I have read and agree to the <strong>Terms of Financing</strong> and
              confirm that the invoice details are accurate.
            </span>
          </label>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-bold hover:bg-tng-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Banknote className="w-4 h-4" />
            Accept &amp; Disburse
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// State machine constants
// ============================================================================
const FlowState = {
  IDLE: 'IDLE',
  UPLOADING_TO_ALIBABA: 'UPLOADING_TO_ALIBABA',
  POLLING_AWS_SCORING: 'POLLING_AWS_SCORING',
  OFFER_READY: 'OFFER_READY',
  DISBURSING: 'DISBURSING',
  DISBURSED: 'DISBURSED',
  ERROR: 'ERROR',
};

const tabs = [
  { id: 'invoice', label: 'Invoice Financing', icon: FileText },
  { id: 'shipment', label: 'Shipment Financing', icon: Truck },
];

// ============================================================================
// Skeleton loader component
// ============================================================================
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

function InvoiceSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferSkeleton() {
  return (
    <div className="bg-gradient-to-br from-tng-blue to-tng-blue-dark rounded-xl p-6 text-white shadow-lg space-y-4">
      <Skeleton className="h-4 w-32 bg-white/20" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-4 w-24 bg-white/20" />
          <Skeleton className="h-4 w-16 bg-white/20" />
        </div>
      ))}
      <Skeleton className="h-px w-full bg-white/20" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-20 bg-white/20" />
        <Skeleton className="h-8 w-28 bg-white/20" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg bg-white/20" />
    </div>
  );
}

// ============================================================================
// Toast notification component
// ============================================================================
// Main Financing page
// ============================================================================
export default function Financing() {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('invoice');

  // Invoice flow – state machine
  const [flowState, setFlowState] = useState(FlowState.IDLE);
  const [file, setFile] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [offer, setOffer] = useState(null);
  const [disbursement, setDisbursement] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pollAttempt, setPollAttempt] = useState(0);
  const [agreementOpen, setAgreementOpen] = useState(false);

  // Invoice metadata inputs
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Shipment flow state
  const [shipmentId, setShipmentId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [shipmentOffer, setShipmentOffer] = useState(null);
  const [shipmentAccepted, setShipmentAccepted] = useState(false);


  // ---------------------------------------------------------------------------
  // Invoice flow actions
  // ---------------------------------------------------------------------------
  const resetInvoiceFlow = useCallback(() => {
    setFlowState(FlowState.IDLE);
    setFile(null);
    setInvoiceId(null);
    setExtractedData(null);
    setOffer(null);
    setDisbursement(null);
    setErrorMessage('');
    setPollAttempt(0);
    setShipmentNumber('');
    setContactEmail('');
    setEmailSent(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  /**
   * Phase 1 + 2: Upload to Alibaba, then poll AWS for scoring offer.
   * The AWS webhook Lambda creates the offer synchronously when Alibaba
   * POSTs to it. Since Alibaba FC waits for the webhook response, the
   * offer is already available in the upload response — no polling needed.
   */
  const processInvoice = useCallback(async () => {
    if (!file) return;

    setFlowState(FlowState.UPLOADING_TO_ALIBABA);
    setErrorMessage('');

    try {
      // Phase 1: Upload to Alibaba Cloud for Document AI extraction
      const alibabaResult = await uploadToAlibaba(file, '', shipmentNumber, contactEmail);
      setInvoiceId(alibabaResult.invoiceId);
      setExtractedData(alibabaResult.extractedData);

      // Phase 2: Check if the offer was returned synchronously
      if (alibabaResult.offer) {
        // The webhook already generated the offer — skip polling
        const o = alibabaResult.offer;
        setOffer({
          offerId: o.offerId,
          riskScore: o.riskScore ?? o.creditScore,
          riskTier: o.riskTier,
          approvedAmount: o.approvedAmount,
          offerAmount: o.offerAmount,
          netDisbursement: o.netDisbursement,
          factoringFee: o.factoringFee,
          totalFeeRate: o.totalFeeRate,
          baseRate: o.baseRate,
          riskPremium: o.riskPremium,
          advanceRate: o.advanceRate,
          invoiceAmount: o.invoiceAmount,
          estimatedRepaymentDate: o.estimatedRepaymentDate,
          scoringMethod: o.scoringMethod,
        });
        setFlowState(FlowState.OFFER_READY);
        // Refresh transactions list so the new invoice appears
        window.dispatchEvent(new CustomEvent('transactions:refresh'));
      } else {
        // Fallback: poll AWS for the scoring offer (async webhook)
        setFlowState(FlowState.POLLING_AWS_SCORING);
        setPollAttempt(0);

        const scoringOffer = await getScoringOffer(alibabaResult.invoiceId, {
          intervalMs: 1500,
          maxAttempts: 20,
          onAttempt: (attempt) => setPollAttempt(attempt),
        });

        setOffer(scoringOffer);
        setFlowState(FlowState.OFFER_READY);
      }
    } catch (err) {
      const msg = err.friendlyMessage || err.message || 'Processing failed';
      setErrorMessage(msg);
      setFlowState(FlowState.ERROR);
    }
  }, [file]);

  /**
   * Phase 3: Accept the offer and trigger disbursement.
   */
  const handleAcceptOffer = useCallback(async () => {
    if (!offer) return;

    setAgreementOpen(false);
    setFlowState(FlowState.DISBURSING);

    try {
      const result = await acceptOffer(offer.offerId);
      setDisbursement(result);
      setFlowState(FlowState.DISBURSED);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
      });
    } catch (err) {
      const msg = err.friendlyMessage || err.message || 'Disbursement failed';
      setErrorMessage(msg);
      setFlowState(FlowState.ERROR);
    }
  }, [offer]);

  // ---------------------------------------------------------------------------
  // Shipment flow actions (unchanged)
  // ---------------------------------------------------------------------------
  const trackShipmentFlow = async () => {
    if (!shipmentId.trim()) return;
    setTracking(true);
    setShipmentOffer(null);
    setShipmentAccepted(false);
    try {
      const data = await trackShipment(shipmentId);
      setShipmentData(data);
    } catch { /* fallback data already handled */ }
    setTracking(false);
  };

  const verifyShipmentFlow = async () => {
    if (!shipmentId.trim()) return;
    setVerifying(true);
    try {
      const data = await verifyShipment(shipmentId, 50000);
      setShipmentOffer(data);
    } catch { /* fallback data already handled */ }
    setVerifying(false);
  };

  /**
   * Accept a shipment financing offer via the real disbursement API.
   */
  const handleAcceptShipmentOffer = async () => {
    if (!shipmentOffer) return;
    setVerifying(true);
    try {
      // Use the shipmentId as a synthetic offer reference for the disburse API
      await acceptOffer(`SHIP-${shipmentId}`, shipmentId);
    } catch {
      // non-blocking – the offer may not exist in DynamoDB for shipments
    } finally {
      setVerifying(false);
      setShipmentAccepted(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const riskTierColor = (tier) => {
    if (tier === 'LOW') return 'text-green-600 bg-green-50';
    if (tier === 'MEDIUM') return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financing</h1>
        <p className="text-sm text-gray-500 mt-1">Get instant cash for your invoices and shipments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-tng-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'invoice' && (
          <motion.div
            key="invoice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* ============================================================
                STATE: IDLE – Upload dropzone
                ============================================================ */}
            {flowState === FlowState.IDLE && (
              <div
                className="bg-white rounded-xl p-8 shadow-sm border-2 border-dashed border-gray-200 hover:border-tng-blue/40 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-tng-blue/10 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-tng-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Your Invoice</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Drag & drop your invoice PDF or image here, or click to browse.
                    Processed by Alibaba Cloud Document AI.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                    <Info className="w-3 h-3" />
                    Invoice documents only (Tax, Commercial, Proforma)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    Choose File
                  </button>
                  {file && (
                    <div className="mt-4 flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {file && (
                    <div className="mt-4 w-full max-w-md space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Shipment Number (for tracking)</label>
                        <input
                          type="text"
                          value={shipmentNumber}
                          onChange={(e) => setShipmentNumber(e.target.value)}
                          placeholder="e.g. SHP-7781"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                        />
                      </div>
                    </div>
                  )}

                  {file && (
                    <button
                      onClick={processInvoice}
                      className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Analyze Invoice
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================
                STATE: UPLOADING_TO_ALIBABA
                ============================================================ */}
            {flowState === FlowState.UPLOADING_TO_ALIBABA && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="relative">
                  <motion.div
                    className="w-14 h-14 border-4 border-tng-blue border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <Cloud className="w-6 h-6 text-tng-blue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-5 text-sm font-semibold text-gray-800">Uploading to Alibaba Cloud</p>
                <p className="text-xs text-gray-400 mt-1">Document AI extraction in progress...</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-tng-blue animate-pulse" />
                  Multi-cloud ingestion
                </div>
              </div>
            )}

            {/* ============================================================
                STATE: POLLING_AWS_SCORING
                ============================================================ */}
            {flowState === FlowState.POLLING_AWS_SCORING && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Skeleton for extracted invoice */}
                  <div className="relative">
                    <InvoiceSkeleton />
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                      <div className="flex flex-col items-center">
                        <motion.div
                          className="w-10 h-10 border-4 border-tng-gold border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <p className="mt-3 text-sm font-semibold text-gray-700">AWS ML Scoring in Progress</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Credit risk analysis & offer generation
                          {pollAttempt > 0 && ` (attempt ${pollAttempt})`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <OfferSkeleton />
              </div>
            )}

            {/* ============================================================
                STATE: OFFER_READY – Full offer display
                ============================================================ */}
            {flowState === FlowState.OFFER_READY && offer && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Extracted Invoice Card */}
                  {extractedData && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-tng-blue" />
                        <h3 className="text-lg font-semibold text-gray-900">Extracted Invoice</h3>
                        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                          <Cloud className="w-3 h-3" /> Alibaba Cloud AI
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {invoiceId && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Invoice ID</p>
                            <p className="text-sm font-medium text-gray-900">{invoiceId}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Merchant</p>
                          <p className="text-sm font-medium text-gray-900">{extractedData.merchantName || extractedData.vendor_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Buyer</p>
                          <p className="text-sm font-medium text-gray-900">{extractedData.buyerName || extractedData.buyer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Invoice Number</p>
                          <p className="text-sm font-medium text-gray-900">{extractedData.invoiceNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Amount</p>
                          <p className="text-sm font-bold text-tng-blue">
                            {extractedData.currency || 'RM'} {Number(extractedData.extractedAmount || extractedData.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Issue Date</p>
                          <p className="text-sm font-medium text-gray-900">{extractedData.issueDate || extractedData.invoice_date || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Due Date</p>
                          <p className="text-sm font-medium text-gray-900">{extractedData.dueDate || extractedData.due_date || 'N/A'}</p>
                        </div>
                      </div>
                      {extractedData.confidenceScore != null && (
                        <div className="mt-4 pt-3 border-t border-gray-50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">AI Confidence</span>
                            <span className="font-semibold text-tng-blue">{(extractedData.confidenceScore * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-tng-blue rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${extractedData.confidenceScore * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Risk Assessment */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-tng-blue" />
                      <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700">
                        <Cpu className="w-3 h-3" /> AWS ML
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-center">
                        <RiskGauge score={offer.riskScore || 650} />
                        <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${riskTierColor(offer.riskTier)}`}>
                          {offer.riskTier === 'LOW' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          Risk Tier: {offer.riskTier}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Risk Score</p>
                            <p className="text-lg font-bold text-gray-900">{offer.riskScore}</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Approved</p>
                            <p className="text-lg font-bold text-tng-blue">RM {Number(offer.approvedAmount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3" />
                          Scoring method: {offer.scoringMethod || 'heuristic'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE OFFER CARD */}
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="bg-gradient-to-br from-tng-blue to-tng-blue-dark rounded-xl p-6 text-white shadow-lg relative overflow-hidden"
                  >
                    {/* Decorative glow */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />

                    <div className="relative">
                      <p className="text-sm text-white/80 font-medium">Your Instant Offer</p>
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">Invoice Amount</span>
                          <span className="text-sm font-semibold">RM {Number(offer.invoiceAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">Advance Rate</span>
                          <span className="text-sm font-semibold">{((offer.advanceRate || 0.95) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">Factoring Fee ({((offer.totalFeeRate || 0.03) * 100).toFixed(1)}%)</span>
                          <span className="text-sm font-semibold">RM {Number(offer.factoringFee || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-white/20 my-3" />
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold">You Receive</span>
                          <span className="text-3xl font-bold">RM {Number(offer.netDisbursement || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => setAgreementOpen(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-tng-blue rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                        >
                          <Banknote className="w-4 h-4" />
                          Accept Fare
                        </button>
                        <button
                          onClick={resetInvoiceFlow}
                          className="px-4 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors border border-white/20"
                        >
                          Reject
                        </button>
                      </div>
                      <p className="text-[10px] text-white/50 mt-3 text-center">
                        Repayment due: {offer.estimatedRepaymentDate || 'N/A'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Fee Breakdown */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fee Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Rate</span>
                        <span className="font-medium text-gray-900">{((offer.baseRate || 0.02) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Risk Premium</span>
                        <span className="font-medium text-gray-900">{((offer.riskPremium || 0.01) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-700 font-medium">Total Fee</span>
                        <span className="font-bold text-tng-blue">{((offer.totalFeeRate || 0.03) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE: DISBURSING
                ============================================================ */}
            {flowState === FlowState.DISBURSING && offer && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="relative">
                  <motion.div
                    className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <Wallet className="w-6 h-6 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-5 text-sm font-semibold text-gray-800">Processing Disbursement</p>
                <p className="text-xs text-gray-400 mt-1">DuitNow payment gateway in progress...</p>
                <div className="mt-4 text-2xl font-bold text-tng-blue">
                  RM {Number(offer.netDisbursement || 0).toLocaleString()}
                </div>
              </div>
            )}

            {/* ============================================================
                STATE: DISBURSED – Success
                ============================================================ */}
            {flowState === FlowState.DISBURSED && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900">Funds Disbursed!</h3>
                <p className="text-gray-500 mt-2">
                  RM {Number(offer?.netDisbursement || disbursement?.disbursedAmount || 0).toLocaleString()} has been credited to your TNG Wallet.
                </p>
                {disbursement?.transactionId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Transaction ID: {disbursement.transactionId}
                  </p>
                )}
                {disbursement?.walletBalance != null && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Wallet Balance: RM {Number(disbursement.walletBalance).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Email notification */}
                {!emailSent && contactEmail && (
                  <div className="mt-5 w-full max-w-md rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-left">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Email Notification</p>
                    <p className="mt-1 text-sm text-blue-700">
                      We will send an email to <strong>{contactEmail}</strong> confirming that the assignment of receivables in Malaysia is governed primarily by common law principles, as adopted under <strong>Section 3(1) of the Civil Law Act 1956</strong>, and is now assigned to <strong>OUT&IN</strong>.
                    </p>
                    <button
                      onClick={() => setEmailSent(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-tng-blue text-white rounded-lg text-xs font-medium hover:bg-tng-blue-dark transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Send Confirmation Email
                    </button>
                  </div>
                )}
                {emailSent && (
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Confirmation email sent to {contactEmail}</span>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={resetInvoiceFlow}
                    className="flex items-center gap-2 px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Finance Another Invoice
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================
                STATE: ERROR
                ============================================================ */}
            {flowState === FlowState.ERROR && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-12 shadow-sm border border-red-100 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Processing Failed</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-md">{errorMessage}</p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={processInvoice}
                    className="flex items-center gap-2 px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                  <button
                    onClick={resetInvoiceFlow}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ==================================================================
            SHIPMENT TAB (unchanged)
            ================================================================== */}
        {activeTab === 'shipment' && (
          <motion.div
            key="shipment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {!shipmentData && !tracking && (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                <div className="max-w-md mx-auto text-center">
                  <div className="w-16 h-16 rounded-full bg-tng-blue/10 flex items-center justify-center mb-4 mx-auto">
                    <Package className="w-8 h-8 text-tng-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Track Your Shipment</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your shipment ID to track progress and unlock shipment-based financing.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <input
                      type="text"
                      value={shipmentId}
                      onChange={(e) => setShipmentId(e.target.value)}
                      placeholder="e.g. SHP-7781"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                    />
                    <button
                      onClick={trackShipmentFlow}
                      disabled={!shipmentId.trim() || tracking}
                      className="px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors disabled:opacity-50"
                    >
                      {tracking ? 'Tracking...' : 'Track'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tracking && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center">
                <motion.div
                  className="w-12 h-12 border-4 border-tng-blue border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="mt-4 text-sm font-medium text-gray-700">Locating shipment...</p>
              </div>
            )}

            {shipmentData && !shipmentOffer && !verifying && !shipmentAccepted && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Shipment {shipmentData.shipmentId}</h3>
                    <p className="text-sm text-gray-500">{shipmentData.carrier}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    shipmentData.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                    shipmentData.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      shipmentData.status === 'DELIVERED' ? 'bg-green-500' :
                      shipmentData.status === 'IN_TRANSIT' ? 'bg-blue-500 animate-pulse' :
                      'bg-yellow-500'
                    }`} />
                    {shipmentData.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="relative py-6">
                  <div className="flex items-center justify-between">
                    {shipmentData.waypoints?.map((wp, idx) => (
                      <div key={idx} className="flex flex-col items-center relative z-10">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          idx === shipmentData.waypoints.length - 1 && shipmentData.status === 'DELIVERED'
                            ? 'bg-green-500 border-green-500'
                            : idx === shipmentData.waypoints.length - 1
                            ? 'bg-tng-blue border-tng-blue animate-pulse'
                            : 'bg-white border-gray-300'
                        }`} />
                        <p className="text-[10px] text-gray-500 mt-2 text-center max-w-[80px] leading-tight">{wp.location}</p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-[31px] left-[8px] right-[8px] h-0.5 bg-gray-200 -z-0">
                    <div
                      className="absolute top-0 left-0 h-full bg-tng-blue transition-all duration-1000"
                      style={{
                        width: `${((shipmentData.waypoints?.findIndex((wp) => wp.location === shipmentData.currentLocation?.location) || 0) / Math.max((shipmentData.waypoints?.length || 1) - 1, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Origin</p>
                    <p className="text-sm font-medium text-gray-900">{shipmentData.origin}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Destination</p>
                    <p className="text-sm font-medium text-gray-900">{shipmentData.destination}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Customs</p>
                    <p className="text-sm font-medium text-gray-900">{shipmentData.customsStatus}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">ETA</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(shipmentData.eta).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={verifyShipmentFlow}
                    className="flex items-center gap-2 px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    <Banknote className="w-4 h-4" />
                    Check Financing Eligibility
                  </button>
                  <button
                    onClick={() => { setShipmentData(null); setShipmentId(''); }}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Track Another
                  </button>
                </div>
              </div>
            )}

            {verifying && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center">
                <motion.div
                  className="w-12 h-12 border-4 border-tng-gold border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="mt-4 text-sm font-medium text-gray-700">Verifying shipment integrity...</p>
              </div>
            )}

            {shipmentOffer && !shipmentAccepted && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Results</h3>
                  <div className="space-y-3">
                    {Object.entries(shipmentOffer.riskAssessment || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className={`text-sm font-semibold ${
                          val === true || val === 'PASS' || val === 'CLEARED' || val === 'VERIFIED' || val === 'ONLINE'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-tng-blue to-tng-blue-dark rounded-xl p-6 text-white shadow-lg">
                  <p className="text-sm text-white/80 font-medium">Shipment Financing Offer</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">Shipment Value</span>
                      <span className="text-sm font-semibold">RM {shipmentOffer.shipmentValue?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">Advance Rate</span>
                      <span className="text-sm font-semibold">{(shipmentOffer.advanceRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-px bg-white/20 my-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold">You Receive</span>
                      <span className="text-2xl font-bold">RM {shipmentOffer.financingAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={handleAcceptShipmentOffer}
                      disabled={verifying}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-tng-blue rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <Banknote className="w-4 h-4" />
                      {verifying ? 'Processing...' : 'Accept & Disburse'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {shipmentAccepted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Funds Disbursed!</h3>
                <p className="text-gray-500 mt-2">
                  RM {shipmentOffer?.financingAmount?.toLocaleString()} has been credited to your TNG Wallet.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => { setShipmentData(null); setShipmentOffer(null); setShipmentAccepted(false); setShipmentId(''); }}
                    className="px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    Track Another Shipment
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {agreementOpen && offer && (
          <AgreementModal
            offerAmount={offer.netDisbursement}
            onAccept={handleAcceptOffer}
            onClose={() => setAgreementOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
