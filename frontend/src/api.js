/**
 * API client module for AI Vehicle Assistant backend.
 * All requests route to VITE_API_URL and include the X-API-Key authentication header.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Core HTTP helper wrapping fetch with standard headers and error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * GET /api/vehicle/health
 * Returns overall score, component scores (engine, battery, brakes, tyres), and raw metrics.
 */
export async function fetchVehicleHealth() {
  return request('/api/vehicle/health');
}

/**
 * GET /api/safety
 * Returns risk_level, safety flags, and recent telemetry events with seconds_ago.
 */
export async function fetchSafetyStatus() {
  return request('/api/safety');
}

/**
 * GET /api/alerts
 * Returns active alerts list [{ id, severity, message, created_at }].
 */
export async function fetchAlerts() {
  const result = await request('/api/alerts');
  return result?.alerts || [];
}

/**
 * POST /api/navigation/route
 * Returns primary and alternative routes, traffic, and coordinates.
 */
export async function calculateNavigationRoute(destination) {
  return request('/api/navigation/route', {
    method: 'POST',
    body: JSON.stringify({ destination }),
  });
}

/**
 * POST /api/assistant/query
 * Returns natural language response text and detected intent.
 */
export async function queryAssistant(message) {
  return request('/api/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * POST /api/demo/scenario
 * Triggers backend simulation scenario (only available when DEMO_MODE=1).
 */
export async function triggerDemoScenario(scenario) {
  return request('/api/demo/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });
}
