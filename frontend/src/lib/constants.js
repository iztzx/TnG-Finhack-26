// Configurable API base URL
// Replace with your deployed API Gateway URL after SAM deployment:
// Example: https://abc123def.execute-api.ap-southeast-1.amazonaws.com/Prod
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/Prod';

// WebSocket URL for IoT telemetry
// Local fallback server runs on ws://localhost:8765
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8765';
