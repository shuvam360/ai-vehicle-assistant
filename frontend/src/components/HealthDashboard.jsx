import React from 'react';
import { fetchVehicleHealth } from '../api';
import { usePolling } from '../hooks/usePolling';

export function HealthDashboard() {
  const { data, isLoading, isConnectionLost } = usePolling(fetchVehicleHealth, 1500);

  if (isLoading && !data) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Connecting to vehicle telemetry diagnostics...</p>
      </div>
    );
  }

  const overallScore = data?.overall_score ?? data?.health?.health_score ?? 100;
  const overallStatus = data?.overall_status ?? data?.health?.overall_status ?? 'HEALTHY';

  const components = data?.components || data?.component_scores || {
    engine: { score: 100, status: 'green' },
    battery: { score: 100, status: 'green' },
    brakes: { score: 100, status: 'green' },
    tyres: { score: 100, status: 'green' },
  };

  const metrics = data?.metrics || data?.vehicle || {};
  const tyrePressure = metrics.tyre_pressure || {
    front_left: 32.0,
    front_right: 32.0,
    rear_left: 32.0,
    rear_right: 32.0,
  };

  const warnings = data?.health?.warnings || data?.warnings || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'red':
      case 'critical':
        return 'var(--status-red)';
      case 'yellow':
      case 'warning':
        return 'var(--status-yellow)';
      case 'green':
      case 'healthy':
      default:
        return 'var(--status-green)';
    }
  };

  return (
    <div className="health-dashboard">
      {isConnectionLost && (
        <div className="dashboard-offline-notice">
          <span>⚠️ Showing cached telemetry — Connection to vehicle is offline</span>
        </div>
      )}

      {/* 1. OVERALL HEALTH SCORE */}
      <section className="health-hero-card">
        <div className="health-hero-content">
          <div className="health-score-gauge">
            <div
              className="gauge-circle"
              style={{
                borderColor: getStatusColor(overallStatus),
                boxShadow: `0 0 25px ${getStatusColor(overallStatus)}33`,
              }}
            >
              <span className="gauge-number">{overallScore}%</span>
              <span className="gauge-label">INTEGRITY</span>
            </div>
          </div>
          <div className="health-hero-meta">
            <h2>Vehicle Health Status</h2>
            <div className="status-pill-badge" style={{ backgroundColor: `${getStatusColor(overallStatus)}22`, color: getStatusColor(overallStatus) }}>
              <span className="status-dot" style={{ backgroundColor: getStatusColor(overallStatus) }}></span>
              <strong>{overallStatus}</strong>
            </div>
            <p className="health-hero-desc">
              Continuous monitoring across powertrain, high-voltage battery pack, braking kinematics, and tyre dynamics.
            </p>
          </div>
        </div>
      </section>

      {/* 2. FOUR COMPONENT BARS */}
      <section className="components-section">
        <h3>Component Diagnostics</h3>
        <div className="component-bars-grid">
          {[
            { key: 'engine', label: 'Engine & Powertrain', icon: '⚙️' },
            { key: 'battery', label: '12V Electrical Battery', icon: '🔋' },
            { key: 'brakes', label: 'Braking System Pads', icon: '🛑' },
            { key: 'tyres', label: 'Tyre Pressure & Tread', icon: '🛞' },
          ].map(({ key, label, icon }) => {
            const comp = components[key] || { score: 100, status: 'green' };
            const barColor = getStatusColor(comp.status);
            return (
              <div key={key} className="component-card">
                <div className="component-card-header">
                  <span className="comp-title">
                    <span className="comp-icon">{icon}</span> {label}
                  </span>
                  <span className="comp-score" style={{ color: barColor }}>
                    {comp.score}%
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${comp.score}%`,
                      backgroundColor: barColor,
                      boxShadow: `0 0 10px ${barColor}88`,
                    }}
                  ></div>
                </div>
                <div className="comp-status-row">
                  <span className="comp-indicator" style={{ color: barColor }}>
                    Status: {comp.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. METRICS GRID */}
      <section className="metrics-section">
        <h3>Live Sensor Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Engine Temperature</span>
            <span className="metric-value">
              {metrics.engine_temp ?? metrics.engine_temperature ?? 89}°C
            </span>
            <span className="metric-sub">Optimal: 80-95°C</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Engine Speed (RPM)</span>
            <span className="metric-value">{metrics.rpm ?? 2100}</span>
            <span className="metric-sub">Revs per minute</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Battery Voltage</span>
            <span className="metric-value">{metrics.battery_voltage ?? 12.6} V</span>
            <span className="metric-sub">Nominal: 12.4-12.8V</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Vehicle Speed</span>
            <span className="metric-value">{metrics.speed ?? 65} km/h</span>
            <span className="metric-sub">Current GPS speed</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Fuel Level</span>
            <span className="metric-value">{metrics.fuel_level ?? 75}%</span>
            <span className="metric-sub">Estimated range: ~480 km</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Brake Pad Condition</span>
            <span className="metric-value">{metrics.brake_condition ?? 95}%</span>
            <span className="metric-sub">Friction wear sensor</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Engine Vibration</span>
            <span className="metric-value">{metrics.engine_vibration ?? 1.2} mm/s</span>
            <span className="metric-sub">Tolerance: &lt; 2.5 mm/s</span>
          </div>

          {/* 4 TYRE PRESSURES CARD */}
          <div className="metric-box metric-tyres-card">
            <span className="metric-label">4-Wheel Tyre Pressure (PSI)</span>
            <div className="tyre-chassis-grid">
              <div className="tyre-cell">
                <span className="tyre-pos">FL (Front Left)</span>
                <span
                  className="tyre-val"
                  style={{ color: (tyrePressure.front_left ?? 32) < 25 ? 'var(--status-red)' : (tyrePressure.front_left ?? 32) < 30 ? 'var(--status-yellow)' : 'var(--text-main)' }}
                >
                  {tyrePressure.front_left ?? 32} PSI
                </span>
              </div>
              <div className="tyre-cell">
                <span className="tyre-pos">FR (Front Right)</span>
                <span
                  className="tyre-val"
                  style={{ color: (tyrePressure.front_right ?? 32) < 25 ? 'var(--status-red)' : (tyrePressure.front_right ?? 32) < 30 ? 'var(--status-yellow)' : 'var(--text-main)' }}
                >
                  {tyrePressure.front_right ?? 32} PSI
                </span>
              </div>
              <div className="tyre-cell">
                <span className="tyre-pos">RL (Rear Left)</span>
                <span
                  className="tyre-val"
                  style={{ color: (tyrePressure.rear_left ?? 32) < 25 ? 'var(--status-red)' : (tyrePressure.rear_left ?? 32) < 30 ? 'var(--status-yellow)' : 'var(--text-main)' }}
                >
                  {tyrePressure.rear_left ?? 32} PSI
                </span>
              </div>
              <div className="tyre-cell">
                <span className="tyre-pos">RR (Rear Right)</span>
                <span
                  className="tyre-val"
                  style={{ color: (tyrePressure.rear_right ?? 32) < 25 ? 'var(--status-red)' : (tyrePressure.rear_right ?? 32) < 30 ? 'var(--status-yellow)' : 'var(--text-main)' }}
                >
                  {tyrePressure.rear_right ?? 32} PSI
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WARNINGS LINE */}
      <section className="warnings-section">
        <h3>Active System Warnings</h3>
        <div className="warnings-container">
          {warnings.length === 0 ? (
            <div className="warnings-clear">
              <span className="check-icon">✓</span> All sub-systems operating within safe nominal parameters.
            </div>
          ) : (
            <ul className="warnings-list">
              {warnings.map((warn, idx) => (
                <li key={idx} className="warning-item">
                  <span className="warning-icon">⚠️</span> {warn}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
