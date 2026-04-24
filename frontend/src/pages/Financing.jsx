import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Upload, FileText, Truck, CheckCircle, X, Zap, Shield, AlertTriangle,
  Banknote, Package
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import { uploadInvoice, analyzeInvoice, getOffer, acceptOffer, trackShipment, verifyShipment } from '../lib/api';

const tabs = [
  { id: 'invoice', label: 'Invoice Financing', icon: FileText },
  { id: 'shipment', label: 'Shipment Financing', icon: Truck },
];

const mockInvoicePreview = {
  vendor_name: 'Syarikat ABC Sdn Bhd',
  buyer_name: 'XYZ Trading',
  invoice_number: 'INV-12345',
  invoice_date: '2026-04-01',
  due_date: '2026-05-15',
  amount: 10000,
  currency: 'RM',
  line_items: [
    { description: 'Electronics Components', quantity: 50, unit_price: 120, total: 6000 },
    { description: 'Shipping & Handling', quantity: 1, unit_price: 4000, total: 4000 },
  ],
};

const mockAnalysis = {
  fraudRisk: 'LOW',
  fraudFlags: [],
  creditScore: 720,
  riskTier: 'LOW',
  riskFactors: {
    payment_consistency: 0.92,
    business_tenure: 0.85,
    txn_volume: 0.78,
    avg_invoice_size: 0.65,
    monthly_revenue: 0.72,
  },
};

const mockOffer = {
  invoiceAmount: 10000,
  advanceRate: 0.95,
  offerAmount: 9500,
  baseRate: 0.02,
  riskPremium: 0.01,
  totalFeeRate: 0.03,
  factoringFee: 300,
  netDisbursement: 9200,
  estimatedRepaymentDate: '2026-05-15',
  creditScore: 720,
};

export default function Financing() {
  const [activeTab, setActiveTab] = useState('invoice');

  // Invoice flow state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [offerResult, setOfferResult] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // Shipment flow state
  const [shipmentId, setShipmentId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [shipmentOffer, setShipmentOffer] = useState(null);
  const [shipmentAccepted, setShipmentAccepted] = useState(false);

  const fileInputRef = useRef(null);

  const resetInvoiceFlow = () => {
    setFile(null);
    setInvoiceData(null);
    setAnalysisResult(null);
    setOfferResult(null);
    setAccepted(false);
    setAccepting(false);
    setUploading(false);
    setAnalyzing(false);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const processInvoice = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const uploadRes = await uploadInvoice(file);
      setInvoiceData(uploadRes.extractedData || mockInvoicePreview);
      setUploading(false);
      setAnalyzing(true);

      // 1.5s simulated processing animation
      await new Promise((r) => setTimeout(r, 1500));

      const analysisRes = await analyzeInvoice(uploadRes.invoiceId);
      setAnalysisResult(analysisRes);
      setAnalyzing(false);

      const offerRes = await getOffer(uploadRes.invoiceId);
      setOfferResult(offerRes.offer || mockOffer);
    } catch (err) {
      console.error(err);
      setInvoiceData(mockInvoicePreview);
      await new Promise((r) => setTimeout(r, 1500));
      setAnalysisResult(mockAnalysis);
      setAnalyzing(false);
      setOfferResult(mockOffer);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!offerResult) return;
    setAccepting(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      await acceptOffer('INV-DEMO-001', offerResult.offerId || 'OFF-DEMO-001');
      setAccepted(true);
      setAccepting(false);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
      });
    } catch {
      setAccepted(true);
      setAccepting(false);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
      });
    }
  };

  const trackShipmentFlow = async () => {
    if (!shipmentId.trim()) return;
    setTracking(true);
    setShipmentOffer(null);
    setShipmentAccepted(false);
    try {
      const data = await trackShipment(shipmentId);
      setShipmentData(data);
      setTracking(false);
    } catch {
      setTracking(false);
    }
  };

  const verifyShipmentFlow = async () => {
    if (!shipmentId.trim()) return;
    setVerifying(true);
    try {
      const data = await verifyShipment(shipmentId, 50000);
      setShipmentOffer(data);
      setVerifying(false);
    } catch {
      setVerifying(false);
    }
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
            {/* Step 1: Upload */}
            {!invoiceData && !uploading && (
              <div
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 border-dashed-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-tng-blue/10 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-tng-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Your Invoice</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Drag & drop your invoice PDF or image here, or click to browse. We accept PDF, JPG, PNG.
                  </p>
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
                    <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
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

            {/* Processing */}
            {uploading && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center">
                <motion.div
                  className="w-12 h-12 border-4 border-tng-blue border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="mt-4 text-sm font-medium text-gray-700">Uploading document...</p>
              </div>
            )}

            {analyzing && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 flex flex-col items-center">
                <motion.div
                  className="w-12 h-12 border-4 border-tng-gold border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="mt-4 text-sm font-medium text-gray-700">Document AI is extracting data...</p>
                <p className="text-xs text-gray-400 mt-1">Fraud checks & credit scoring in progress</p>
              </div>
            )}

            {/* Extracted Invoice Preview */}
            {invoiceData && analysisResult && offerResult && !accepted && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Invoice Card */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-tng-blue" />
                      <h3 className="text-lg font-semibold text-gray-900">Extracted Invoice</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Vendor</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.vendor_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Buyer</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.buyer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Invoice Number</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Amount</p>
                        <p className="text-sm font-bold text-tng-blue">{invoiceData.currency} {invoiceData.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Invoice Date</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.invoice_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Due Date</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.due_date}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase mb-2">Line Items</p>
                      <div className="space-y-2">
                        {invoiceData.line_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                            <span className="text-gray-700">{item.description} × {item.quantity}</span>
                            <span className="font-medium text-gray-900">{invoiceData.currency} {item.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-tng-blue" />
                      <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-center">
                        <RiskGauge score={analysisResult.creditScore} />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            analysisResult.fraudRisk === 'LOW' ? 'bg-green-50 text-green-700' :
                            analysisResult.fraudRisk === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {analysisResult.fraudRisk === 'LOW' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            Fraud Risk: {analysisResult.fraudRisk}
                          </span>
                        </div>
                        {analysisResult.fraudFlags?.length > 0 && (
                          <div className="space-y-1">
                            {analysisResult.fraudFlags.map((flag, i) => (
                              <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {flag}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2 pt-2">
                          {Object.entries(analysisResult.riskFactors || {}).map(([key, val]) => (
                            <div key={key}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="font-medium">{(val * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-tng-blue rounded-full" style={{ width: `${val * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE OFFER */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-tng-blue to-tng-blue-dark rounded-xl p-6 text-white shadow-lg">
                    <p className="text-sm text-white/80 font-medium">Your Instant Offer</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Invoice Amount</span>
                        <span className="text-sm font-semibold">RM {offerResult.invoiceAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Advance Rate</span>
                        <span className="text-sm font-semibold">{(offerResult.advanceRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Factoring Fee ({(offerResult.totalFeeRate * 100).toFixed(1)}%)</span>
                        <span className="text-sm font-semibold">RM {offerResult.factoringFee.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-white/20 my-3" />
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">You Receive</span>
                        <span className="text-3xl font-bold">RM {offerResult.netDisbursement.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={handleAcceptOffer}
                        disabled={accepting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-tng-blue rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-60"
                      >
                        {accepting ? (
                          <motion.div className="w-4 h-4 border-2 border-tng-blue border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                        ) : (
                          <>
                            <Banknote className="w-4 h-4" />
                            Accept Offer
                          </>
                        )}
                      </button>
                      <button
                        onClick={resetInvoiceFlow}
                        className="px-4 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors border border-white/20"
                      >
                        Reject
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-3 text-center">
                      Estimated repayment: {offerResult.estimatedRepaymentDate}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fee Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Rate</span>
                        <span className="font-medium text-gray-900">{(offerResult.baseRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Risk Premium</span>
                        <span className="font-medium text-gray-900">{(offerResult.riskPremium * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-700 font-medium">Total Fee</span>
                        <span className="font-bold text-tng-blue">{(offerResult.totalFeeRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accepted State */}
            {accepted && (
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
                  RM {offerResult?.netDisbursement.toLocaleString()} has been credited to your TNG Wallet.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={resetInvoiceFlow}
                    className="px-5 py-2.5 bg-tng-blue text-white rounded-lg text-sm font-medium hover:bg-tng-blue-dark transition-colors"
                  >
                    Finance Another Invoice
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

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

                {/* Path Visualization */}
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
                        width: `${((shipmentData.waypoints?.findIndex((wp) => wp.location === shipmentData.currentLocation?.location) || 0) / Math.max((shipmentData.waypoints?.length || 1) - 1, 1)) * 100}%`
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
                      onClick={() => {
                        setShipmentAccepted(true);
                        confetti({
                          particleCount: 120,
                          spread: 70,
                          origin: { y: 0.6 },
                          colors: ['#005ABB', '#F5A623', '#22c55e', '#ffffff'],
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-tng-blue rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                      <Banknote className="w-4 h-4" />
                      Accept & Disburse
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
    </div>
  );
}
