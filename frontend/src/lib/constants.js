// Configurable API base URL
// Replace with your deployed API Gateway URL after SAM deployment:
// Example: https://abc123def.execute-api.ap-southeast-1.amazonaws.com/Prod
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/Prod';

// Alibaba Cloud Function Compute URL for invoice upload + Document AI extraction
export const ALIBABA_FC_URL = import.meta.env.VITE_ALIBABA_FC_URL || 'https://YOUR-FC-ID.ap-southeast-3.fcapp.run';

// WebSocket URL for real-time updates
// Local fallback server runs on ws://localhost:8765
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8765';

// Polling configuration for AWS scoring result
export const SCORING_POLL_INTERVAL_MS = 1500;
export const SCORING_POLL_MAX_ATTEMPTS = 20;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000;
