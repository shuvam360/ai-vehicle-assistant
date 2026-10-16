import React from 'react';

/**
 * Checks if a safety flag string represents a safe/passing check vs an active hazard.
 */
function isSafeFlag(flagText) {
  if (!flagText) return false;
  const lower = flagText.toLowerCase();
  return (
    lower.includes('no collision') ||
    lower.includes('normal') ||
    lower.includes('safe') ||
    lower.includes('clear') ||
    lower.includes('optimal') ||
    lower.includes('ok')
  );
}

export function SafetyFlags({ flags = [] }) {
  if (!flags || flags.length === 0) {
    return (
      <div className="safety-section-card">
        <h3 className="section-title">Safety Status Checks & Flags</h3>
        <div className="empty-state-card">
          <span className="empty-icon">📋</span>
          <p>No active safety flags currently registered.</p>
        </div>
      </div>
    );
  }

  const warningFlags = flags.filter(f => !isSafeFlag(f));
  const safeFlags = flags.filter(f => isSafeFlag(f));

  return (
    <div className="safety-section-card">
      <div className="section-header-wrap">
        <h3 className="section-title">Safety Diagnostics & Active Flags</h3>
        <span className="section-badge-counter">
          {warningFlags.length > 0 ? (
            <span className="counter-danger">{warningFlags.length} Warning{warningFlags.length > 1 ? 's' : ''}</span>
          ) : (
            <span className="counter-safe">All Checks Passed</span>
          )}
        </span>
      </div>

      <div className="flags-grid">
        {/* Render Warnings First so driver sees hazards immediately */}
        {warningFlags.map((flag, idx) => {
          const isCritical = flag.toLowerCase().includes('collision') || flag.toLowerCase().includes('critical');
          return (
            <div
              key={`warning-${idx}`}
              className={`flag-item flag-warning ${isCritical ? 'flag-critical' : ''}`}
            >
              <div className="flag-icon-wrap warning-icon-wrap">
                {isCritical ? '🚨' : '⚠️'}
              </div>
              <div className="flag-content">
                <span className="flag-label">{isCritical ? 'CRITICAL HAZARD' : 'SAFETY WARNING'}</span>
                <span className="flag-text">{flag}</span>
              </div>
            </div>
          );
        })}

        {/* Render Passed Safety Checks */}
        {safeFlags.map((flag, idx) => (
          <div key={`safe-${idx}`} className="flag-item flag-safe">
            <div className="flag-icon-wrap check-icon-wrap">
              ✓
            </div>
            <div className="flag-content">
              <span className="flag-label">SYSTEM NOMINAL</span>
              <span className="flag-text">{flag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
