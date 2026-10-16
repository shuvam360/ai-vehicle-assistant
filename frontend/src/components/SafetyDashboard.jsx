import React, { useRef, useEffect } from 'react';
import { fetchSafetyStatus } from '../api';
import { usePolling } from '../hooks/usePolling';
import { RiskBadge } from './RiskBadge';
import { SafetyFlags } from './SafetyFlags';
import { RecentEvents } from './RecentEvents';

export function SafetyDashboard() {
  const { data, error, isConnectionLost, isLoading, refetch } = usePolling(fetchSafetyStatus, 1500);

  // Keep track of the local timestamp when data was fetched to feed live seconds_ago counter
  const lastFetchedAtRef = useRef(Date.now());

  useEffect(() => {
    if (data) {
      lastFetchedAtRef.current = Date.now();
    }
  }, [data]);

  // Loading state (initial fetch)
  if (isLoading && !data) {
    return (
      <div className="safety-dashboard-container">
        <div className="safety-loading-card">
          <div className="scanner-line"></div>
          <div className="loading-content">
            <span className="loading-icon">🛡️</span>
            <h3>Analyzing Safety Telemetry</h3>
            <p>Scanning onboard collision sensors, driver telemetry, and mechanical risk thresholds...</p>
          </div>
        </div>
      </div>
    );
  }

  // Fatal Error state (when no initial data could be loaded)
  if (error && !data) {
    return (
      <div className="safety-dashboard-container">
        <div className="safety-error-card">
          <span className="error-icon">⚠️</span>
          <h3>Safety Telemetry Unavailable</h3>
          <p>{error.message || 'Unable to establish real-time link with vehicle safety diagnostics.'}</p>
          <button className="retry-btn" onClick={refetch}>
            Retry Link
          </button>
        </div>
      </div>
    );
  }

  const riskLevel = data?.risk_level || 'LOW';
  const flags = data?.flags || [];
  const events = data?.events || [];
  const vehicle = data?.vehicle || {};

  return (
    <div className="safety-dashboard-container">
      {/* Connection Lost Notification banner */}
      {isConnectionLost && (
        <div className="connection-lost-banner">
          <div className="conn-status-dot"></div>
          <span>Connection to Safety API lost. Reconnecting in the background...</span>
          <button className="reconnect-btn" onClick={refetch}>Reconnect</button>
        </div>
      )}

      {/* Hero Risk Level Indicator Badge */}
      <RiskBadge riskLevel={riskLevel} vehicle={vehicle} />

      {/* Main Grid: Flags on the left, Recent Events on the right (or stacked on mobile) */}
      <div className="safety-content-grid">
        <div className="safety-flags-column">
          <SafetyFlags flags={flags} />
        </div>

        <div className="safety-events-column">
          <RecentEvents events={events} lastFetchedAt={lastFetchedAtRef.current} />
        </div>
      </div>
    </div>
  );
}
