import axios from 'axios';
import { API_BASE_URL } from './constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error('Request Error:', error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Existing API functions
export const triggerCredit = async (userId = 'demo-user-001') => {
  try {
    const response = await api.post('/trigger', { userId });
    return response.data;
  } catch (err) {
    console.warn('triggerCredit fallback:', err.message);
    return {
      approved: true,
      creditAmount: 212500,
      riskScore: 780,
      riskLevel: 'LOW',
      featureImportance: { payment_consistency: 0.92, business_tenure: 0.85, txn_volume: 0.78 },
      processingMs: 850,
    };
  }
};

export const getTransactions = async (userId = 'demo-user-001') => {
  try {
    const response = await api.get(`/transactions/${userId}`);
    return response.data;
  } catch (err) {
    console.warn('getTransactions fallback:', err.message);
    return {
      transactions: [
        { userId, timestamp: '1713952800000', creditAmount: 12500, riskScore: 320, status: 'APPROVED', latencyMs: 450 },
        { userId, timestamp: '1713866400000', creditAmount: 8700, riskScore: 450, status: 'APPROVED', latencyMs: 520 },
        { userId, timestamp: '1713780000000', creditAmount: 23400, riskScore: 720, status: 'PENDING', latencyMs: 2100 },
        { userId, timestamp: '1713693600000', creditAmount: 5600, riskScore: 180, status: 'APPROVED', latencyMs: 380 },
      ]
    };
  }
};

export const downloadReconciliation = async () => {
  try {
    const response = await api.get('/reconciliation/download', {
      responseType: 'arraybuffer',
    });
    return response.data;
  } catch (err) {
    console.warn('downloadReconciliation fallback:', err.message);
    throw err;
  }
};

export const getLatestTelemetry = async () => {
  try {
    const response = await api.get('/telemetry/latest');
    return response.data;
  } catch (err) {
    console.warn('getLatestTelemetry fallback:', err.message);
    return {
      deviceId: 'demo-device-001',
      gps: { lat: 3.1390, lng: 101.6869 },
      battery: 87,
      signal: -65,
      temperature: 32.5,
      timestamp: Date.now(),
    };
  }
};

// Invoice financing APIs
export const uploadInvoice = async (file, userId = 'demo-user-001') => {
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await api.post('/invoice/upload', {
      userId,
      fileBase64: base64,
      fileName: file.name,
    });
    return response.data;
  } catch (err) {
    console.warn('uploadInvoice fallback:', err.message);
    return {
      invoiceId: 'INV-FALLBACK-001',
      extractedData: {
        vendor_name: 'Syarikat ABC Sdn Bhd',
        buyer_name: 'XYZ Trading',
        invoice_number: 'INV-12345',
        invoice_date: '2026-04-01',
        due_date: '2026-05-15',
        amount: 15000,
        currency: 'RM',
        line_items: [{ description: 'Goods / Services', quantity: 1, unit_price: 15000, total: 15000 }],
      },
      status: 'PENDING_REVIEW',
      uploadedAt: Date.now(),
    };
  }
};

export const analyzeInvoice = async (invoiceId, userId = 'demo-user-001') => {
  try {
    const response = await api.post('/invoice/analyze', { userId, invoiceId });
    return response.data;
  } catch (err) {
    console.warn('analyzeInvoice fallback:', err.message);
    return {
      invoiceId,
      fraudRisk: 'LOW',
      fraudFlags: [],
      creditScore: 720,
      riskTier: 'LOW',
      riskFactors: { payment_consistency: 0.92, business_tenure: 0.85, txn_volume: 0.78, avg_invoice_size: 0.65, monthly_revenue: 0.72 },
      status: 'ANALYZED',
    };
  }
};

export const getOffer = async (invoiceId, userId = 'demo-user-001') => {
  try {
    const response = await api.post('/invoice/offer', { userId, invoiceId });
    return response.data;
  } catch (err) {
    console.warn('getOffer fallback:', err.message);
    return {
      invoiceId,
      offer: {
        offerId: 'OFF-FALLBACK-001',
        invoiceAmount: 15000,
        advanceRate: 0.95,
        offerAmount: 14250,
        baseRate: 0.02,
        riskPremium: 0.01,
        totalFeeRate: 0.03,
        factoringFee: 450,
        netDisbursement: 13800,
        estimatedRepaymentDate: '2026-05-15',
        creditScore: 720,
        offeredAt: Date.now(),
      },
      status: 'OFFER_MADE',
    };
  }
};

export const acceptOffer = async (invoiceId, offerId, userId = 'demo-user-001') => {
  try {
    const response = await api.post('/invoice/accept', { userId, invoiceId, offerId });
    return response.data;
  } catch (err) {
    console.warn('acceptOffer fallback:', err.message);
    return {
      invoiceId,
      offerId: offerId || 'OFF-FALLBACK-001',
      transactionId: 'TXN-FALLBACK-001',
      disbursedAmount: 13800,
      walletBalanceUpdate: 13800,
      status: 'FUNDED',
      fundedAt: Date.now(),
    };
  }
};

export const listInvoices = async (userId = 'demo-user-001') => {
  try {
    const response = await api.get(`/invoices/${userId}`);
    return response.data;
  } catch (err) {
    console.warn('listInvoices fallback:', err.message);
    return {
      invoices: [
        {
          userId, invoiceId: 'INV-001', timestamp: '1713952800000', status: 'FUNDED',
          vendorName: 'Syarikat ABC Sdn Bhd', buyerName: 'XYZ Trading',
          invoiceNumber: 'INV-12345', invoiceDate: '2026-04-01', dueDate: '2026-05-15',
          amount: 15000, currency: 'RM',
          offerData: { netDisbursement: 13800, totalFeeRate: 0.03, factoringFee: 450 },
        },
        {
          userId, invoiceId: 'INV-002', timestamp: '1713866400000', status: 'REPAID',
          vendorName: 'Mega Logistics Malaysia', buyerName: 'Global Imports Pte Ltd',
          invoiceNumber: 'INV-67890', invoiceDate: '2026-03-15', dueDate: '2026-04-15',
          amount: 25000, currency: 'RM',
          offerData: { netDisbursement: 23000, totalFeeRate: 0.025, factoringFee: 625 },
        },
      ]
    };
  }
};

// Shipment tracking APIs
export const trackShipment = async (shipmentId) => {
  try {
    const response = await api.post('/shipment/track', { shipmentId });
    return response.data;
  } catch (err) {
    console.warn('trackShipment fallback:', err.message);
    return {
      shipmentId: shipmentId || 'SHP-001',
      currentLocation: { location: 'Port Klang, Malaysia', lat: 2.9994, lng: 101.3925 },
      origin: 'Port Klang, Malaysia',
      destination: 'Singapore Port, Singapore',
      status: 'IN_TRANSIT',
      eta: '2026-05-01T12:00:00Z',
      customsStatus: 'CLEARED',
      carrier: 'Maersk Line',
      waypoints: [
        { location: 'Port Klang, Malaysia', lat: 2.9994, lng: 101.3925, timestamp: '2026-04-01T08:00:00Z' },
        { location: 'Malacca Strait', lat: 2.1896, lng: 102.2501, timestamp: '2026-04-02T14:30:00Z' },
        { location: 'Singapore Port, Singapore', lat: 1.2644, lng: 103.8225, timestamp: '2026-04-03T09:00:00Z' },
      ],
      lastUpdated: Date.now(),
    };
  }
};

export const verifyShipment = async (shipmentId, shipmentValue = 50000) => {
  try {
    const response = await api.post('/shipment/verify', { shipmentId, shipmentValue });
    return response.data;
  } catch (err) {
    console.warn('verifyShipment fallback:', err.message);
    return {
      shipmentId: shipmentId || 'SHP-001',
      eligible: true,
      financingAmount: 42500,
      advanceRate: 0.85,
      shipmentValue,
      riskAssessment: {
        carrierApiStatus: 'CONNECTED',
        satelliteImageryAvailable: true,
        customsClearance: 'CLEARED',
        carrierVerification: 'VERIFIED',
        deliveryConfirmation: true,
        routeIntegrity: 'VERIFIED',
        locationAccuracy: 'HIGH',
      },
    };
  }
};

// Analytics API
export const getAnalytics = async (userId = 'demo-user-001') => {
  try {
    const response = await api.get(`/analytics/${userId}`);
    return response.data;
  } catch (err) {
    console.warn('getAnalytics fallback:', err.message);
    return {
      userId,
      totalFinanced: 368000,
      totalRepaid: 245000,
      activeInvoices: 3,
      avgFactoringRate: 0.028,
      cashFlowSummary: [
        { month: '2025-11', disbursements: 45000 },
        { month: '2025-12', disbursements: 62000 },
        { month: '2026-01', disbursements: 38000 },
        { month: '2026-02', disbursements: 71000 },
        { month: '2026-03', disbursements: 55000 },
        { month: '2026-04', disbursements: 97000 },
      ],
      utilizationRate: 0.42,
    };
  }
};

export default api;
