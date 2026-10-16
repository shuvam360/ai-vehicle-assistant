import React from 'react';

function getTrafficClass(traffic) {
  switch ((traffic || '').toUpperCase()) {
    case 'LIGHT':
      return 'traffic-light';
    case 'MODERATE':
      return 'traffic-moderate';
    case 'HEAVY':
      return 'traffic-heavy';
    default:
      return 'traffic-moderate';
  }
}

export function RouteDetails({ routeData = null }) {
  if (!routeData) {
    return (
      <div className="route-details-card empty-route-card">
        <div className="empty-route-icon">🗺️</div>
        <h3>Ready for Navigation</h3>
        <p>
          Enter a destination above or select a quick destination chip to calculate live routing with primary and alternative paths.
        </p>
        <div className="origin-status-pill">
          <span>📍 GPS Origin Locked: Kolkata Central (88.3639, 22.5726)</span>
        </div>
      </div>
    );
  }

  const primary = routeData.primary || {};
  const alternatives = routeData.alternatives || [];
  const isMock = Boolean(routeData.mock);
  const traffic = routeData.traffic || 'MODERATE';
  const trafficClass = getTrafficClass(traffic);

  return (
    <div className="route-details-card">
      {/* Route Header with Destination and Status Badges */}
      <div className="route-header-wrap">
        <div className="route-dest-group">
          <span className="route-dest-label">DESTINATION</span>
          <h2 className="route-dest-title">{routeData.destination}</h2>
        </div>

        <div className="route-badges-group">
          {/* Traffic Status Pill */}
          <div className={`traffic-badge-pill ${trafficClass}`}>
            <span className="traffic-dot"></span>
            <span>TRAFFIC: {traffic.toUpperCase()}</span>
          </div>

          {/* "Simulated data" badge when mock is true */}
          {isMock ? (
            <div className="source-badge-pill mock-badge">
              <span>⚠️ Simulated Data</span>
            </div>
          ) : (
            <div className="source-badge-pill live-badge">
              <span>🌐 Live OSRM Route</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Route Hero Card */}
      <div className="primary-route-card">
        <div className="route-card-header">
          <span className="route-type-badge primary-badge">PRIMARY ROUTE (FASTEST)</span>
          <span className="route-solid-indicator"></span>
        </div>

        <div className="route-stats-grid">
          <div className="stat-block">
            <span className="stat-label">DISTANCE</span>
            <span className="stat-value primary-value">{primary.distance_km ?? '--'} <small>km</small></span>
          </div>
          <div className="stat-block">
            <span className="stat-label">EST. DURATION</span>
            <span className="stat-value primary-value">{primary.duration_min ?? '--'} <small>min</small></span>
          </div>
          <div className="stat-block">
            <span className="stat-label">CONDITIONS</span>
            <span className="stat-value-sub">{traffic} FLOW</span>
          </div>
        </div>
      </div>

      {/* Alternative Routes List */}
      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h4 className="alternatives-title">Alternative Options</h4>
          <div className="alternatives-list">
            {alternatives.map((alt, idx) => {
              const diffDist = primary.distance_km ? (alt.distance_km - primary.distance_km).toFixed(1) : 0;
              const diffDur = primary.duration_min ? (alt.duration_min - primary.duration_min).toFixed(1) : 0;

              return (
                <div key={`alt-${idx}`} className="alternative-route-card">
                  <div className="alt-header">
                    <span className="route-type-badge alt-badge">ALTERNATIVE {idx + 1}</span>
                    <span className="route-dashed-indicator"></span>
                  </div>

                  <div className="alt-stats-row">
                    <div className="alt-stat">
                      <span className="alt-stat-label">Distance:</span>
                      <strong>{alt.distance_km} km</strong>
                      {diffDist > 0 && <span className="diff-pill">+{diffDist} km</span>}
                    </div>

                    <div className="alt-stat">
                      <span className="alt-stat-label">Est. Time:</span>
                      <strong>{alt.duration_min} min</strong>
                      {diffDur > 0 && <span className="diff-pill">+{diffDur} min</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Turn-by-Turn Guidance Steps */}
      {routeData.route && Array.isArray(routeData.route) && routeData.route.length > 0 && (
        <div className="directions-section">
          <h4 className="directions-title">Route Guidance</h4>
          <ol className="directions-list">
            {routeData.route.map((step, idx) => (
              <li key={`step-${idx}`} className="direction-step">
                <span className="step-number">{idx + 1}</span>
                <span className="step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
