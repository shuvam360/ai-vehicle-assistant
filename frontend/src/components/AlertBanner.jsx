import React, { useState, useEffect, useRef } from 'react';
import { fetchAlerts } from '../api';
import { usePolling } from '../hooks/usePolling';

export function AlertBanner({ onAlertsUpdate }) {
  const { data: alerts = [], isConnectionLost } = usePolling(fetchAlerts, 1500);
  const [isMuted, setIsMuted] = useState(false);
  const spokenAlertIdsRef = useRef(new Set());

  // Notify parent component of current alerts if callback provided (for Phase D emergency flow)
  useEffect(() => {
    if (onAlertsUpdate) {
      onAlertsUpdate(alerts || []);
    }
  }, [alerts, onAlertsUpdate]);

  // SpeechSynthesis announcement tracking
  useEffect(() => {
    if (!alerts || !Array.isArray(alerts)) return;

    const currentIds = new Set(alerts.map((a) => a.id));

    // Forget IDs that are no longer active so they can be announced again if retriggered later
    for (const spokenId of spokenAlertIdsRef.current) {
      if (!currentIds.has(spokenId)) {
        spokenAlertIdsRef.current.delete(spokenId);
      }
    }

    // Announce new alerts
    if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      alerts.forEach((alert) => {
        if (!spokenAlertIdsRef.current.has(alert.id)) {
          spokenAlertIdsRef.current.add(alert.id);
          try {
            const utterance = new SpeechSynthesisUtterance(alert.message);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn('Speech synthesis failed:', err);
          }
        }
      });
    }
  }, [alerts, isMuted]);

  const toggleMute = () => {
    if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsMuted((prev) => !prev);
  };

  const hasAlerts = Array.isArray(alerts) && alerts.length > 0;

  if (!hasAlerts && !isConnectionLost) {
    return null;
  }

  return (
    <div className="alert-banner-container" role="alert" aria-live="assertive">
      {isConnectionLost && (
        <div className="alert-item alert-connection-lost">
          <span className="alert-icon">⚡</span>
          <div className="alert-content">
            <strong>TELEMETRY OFFLINE:</strong> Connection lost to vehicle backend service.
          </div>
        </div>
      )}

      {hasAlerts && (
        <div className="alert-list">
          <div className="alert-controls">
            <button
              className={`mute-btn ${isMuted ? 'muted' : 'active'}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute voice announcements' : 'Mute voice announcements'}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {isMuted ? '🔇 Audio Muted' : '🔊 Voice Alerts Active'}
            </button>
          </div>

          {alerts.map((alert) => {
            const severityClass = `alert-severity-${(alert.severity || 'WARNING').toLowerCase()}`;
            return (
              <div key={alert.id} className={`alert-item ${severityClass}`}>
                <div className="alert-badge">
                  {alert.severity === 'EMERGENCY' ? '🚨 EMERGENCY' : alert.severity === 'CRITICAL' ? '⚠️ CRITICAL' : '⚡ WARNING'}
                </div>
                <div className="alert-message">{alert.message}</div>
                {alert.created_at && (
                  <div className="alert-timestamp">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
