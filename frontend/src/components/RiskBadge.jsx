import React from 'react';

const RISK_CONFIG = {
  LOW: {
    label: 'LOW RISK',
    title: 'ALL SYSTEMS NOMINAL',
    description: 'Vehicle and driving environment are operating within safe baseline parameters.',
    badgeClass: 'risk-badge-low',
    glowColor: 'var(--status-green)',
    textColor: 'var(--status-green)',
    icon: '🛡️',
  },
  MEDIUM: {
    label: 'MEDIUM RISK',
    title: 'SAFETY ADVISORY',
    description: 'Advisory driving conditions or moderate sensor variations detected. Drive with caution.',
    badgeClass: 'risk-badge-medium',
    glowColor: 'var(--status-yellow)',
    textColor: 'var(--status-yellow)',
    icon: '⚠️',
  },
  HIGH: {
    label: 'HIGH RISK',
    title: 'ELEVATED HAZARD',
    description: 'Significant risk detected (e.g. high speed or critically low tyre pressure). Immediate attention recommended.',
    badgeClass: 'risk-badge-high',
    glowColor: '#f97316',
    textColor: '#f97316',
    icon: '⚡',
  },
  CRITICAL: {
    label: 'CRITICAL EMERGENCY',
    title: 'IMMEDIATE HAZARD DETECTED',
    description: 'Severe impact, extreme engine overheat, or acute failure active! Stop vehicle safely immediately.',
    badgeClass: 'risk-badge-critical',
    glowColor: 'var(--status-red)',
    textColor: 'var(--status-red)',
    icon: '🚨',
  },
};

export function RiskBadge({ riskLevel = 'LOW', vehicle = null }) {
  const normalizedLevel = (riskLevel || 'LOW').toUpperCase();
  const config = RISK_CONFIG[normalizedLevel] || RISK_CONFIG.LOW;

  const speed = vehicle?.speed !== undefined ? vehicle.speed : null;
  const engineTemp = vehicle?.engine_temp !== undefined ? vehicle.engine_temp : (vehicle?.engine_temperature || null);
  const collision = vehicle?.collision_detected;

  return (
    <div className={`risk-hero-card ${config.badgeClass}`}>
      <div className="risk-hero-main">
        <div className="risk-indicator-circle" style={{ borderColor: config.glowColor, boxShadow: `0 0 24px ${config.glowColor}50` }}>
          <span className="risk-icon">{config.icon}</span>
        </div>

        <div className="risk-hero-details">
          <div className="risk-badge-pill" style={{ borderColor: config.glowColor, color: config.textColor }}>
            <span className="risk-dot" style={{ backgroundColor: config.glowColor }}></span>
            <span className="risk-badge-text">{config.label}</span>
          </div>
          <h2 className="risk-hero-title">{config.title}</h2>
          <p className="risk-hero-desc">{config.description}</p>
        </div>
      </div>

      {/* Snapshot quick-glance chips */}
      <div className="risk-telemetry-chips">
        <div className="telemetry-chip">
          <span className="chip-label">SPEED</span>
          <span className="chip-value">{speed !== null ? `${speed} km/h` : '--'}</span>
        </div>
        <div className="telemetry-chip">
          <span className="chip-label">COOLANT</span>
          <span className="chip-value">{engineTemp !== null ? `${engineTemp} °C` : '--'}</span>
        </div>
        <div className="telemetry-chip">
          <span className="chip-label">IMPACT SENSOR</span>
          <span className={`chip-value ${collision ? 'impact-danger' : 'impact-safe'}`}>
            {collision ? 'TRIPPED ⚠️' : 'CLEAR ✓'}
          </span>
        </div>
      </div>
    </div>
  );
}
