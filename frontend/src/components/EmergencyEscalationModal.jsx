import React from 'react';

export function EmergencyEscalationModal({
  isOpen = false,
  step = 'prompt', // 'prompt' | 'escalated' | 'resolved'
  countdown = 10,
  onConfirmSafe,
  onEscalate,
  onDismiss,
}) {
  if (!isOpen) return null;

  return (
    <div className="emergency-modal-overlay">
      <div className={`emergency-modal-card ${step === 'escalated' ? 'escalated-mode' : 'prompt-mode'}`}>
        {/* PROMPT STEP: "Are you okay?" */}
        {step === 'prompt' && (
          <div className="emergency-prompt-container">
            <div className="emergency-siren-wrapper">
              <span className="emergency-siren-icon">🚨</span>
            </div>

            <div className="emergency-headline-wrap">
              <span className="emergency-alert-tag">CRITICAL VEHICLE IMPACT DETECTED</span>
              <h1 className="emergency-main-question">"Are you okay?"</h1>
              <p className="emergency-subtext">
                Listening for driver response. Please speak aloud or tap a response below.
              </p>
            </div>

            {/* Countdown Timer Display */}
            <div className="emergency-timer-block">
              <div className="timer-bar-track">
                <div
                  className="timer-bar-fill"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                ></div>
              </div>
              <span className="timer-countdown-text">
                Auto-escalating in <strong>{countdown}s</strong> if no response
              </span>
            </div>

            {/* Response Buttons */}
            <div className="emergency-actions-row">
              <button
                type="button"
                className="btn-confirm-safe"
                onClick={onConfirmSafe}
              >
                <span className="btn-icon">✓</span>
                <span>I AM OKAY / SAFE</span>
              </button>

              <button
                type="button"
                className="btn-request-help"
                onClick={onEscalate}
              >
                <span className="btn-icon">🚨</span>
                <span>NO, I NEED HELP</span>
              </button>
            </div>

            <div className="voice-cue-note">
              <span>🎙️ Voice Recognition Active: Say "I am fine", "Yes", or "Help"</span>
            </div>
          </div>
        )}

        {/* ESCALATED STEP: Large Emergency Escalation State */}
        {step === 'escalated' && (
          <div className="emergency-escalated-container">
            <div className="escalated-header">
              <div className="strobe-siren">🚨</div>
              <h1 className="escalated-title">EMERGENCY ESCALATION ACTIVE</h1>
              <p className="escalated-subtitle">Automatic Crash Response Protocol Initiated</p>
            </div>

            <div className="escalation-telemetry-box">
              <div className="telemetry-row">
                <span className="t-label">INCIDENT TYPE:</span>
                <span className="t-val val-danger">HIGH SEVERITY COLLISION</span>
              </div>
              <div className="telemetry-row">
                <span className="t-label">GPS COORDINATES:</span>
                <span className="t-val font-mono">22.5726° N, 88.3639° E (KOLKATA)</span>
              </div>
              <div className="telemetry-row">
                <span className="t-label">EMERGENCY DISPATCH:</span>
                <span className="t-val">Ambulance & Highway Rescue Alerted</span>
              </div>
              <div className="telemetry-row">
                <span className="t-label">STATUS:</span>
                <span className="t-val val-pulsing">TRANSMITTING TELEMETRY DATA</span>
              </div>
            </div>

            {/* Required Simulation Disclaimer */}
            <div className="escalation-disclaimer">
              <span>⚠️ Display only — Simulated protocol. No actual 911/emergency calls placed.</span>
            </div>

            <button
              type="button"
              className="btn-stand-down"
              onClick={onDismiss}
            >
              Stand Down / Dismiss Escalation
            </button>
          </div>
        )}

        {/* RESOLVED STEP */}
        {step === 'resolved' && (
          <div className="emergency-resolved-container">
            <div className="resolved-icon">✓</div>
            <h2>Driver Confirmed Safe</h2>
            <p>Emergency prompt cleared. Continuing normal vehicle telemetry monitoring.</p>
            <button
              type="button"
              className="btn-stand-down"
              onClick={onDismiss}
            >
              Return to Cockpit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
