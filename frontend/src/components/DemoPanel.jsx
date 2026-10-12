import React, { useState } from 'react';
import { triggerDemoScenario } from '../api';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Baseline', desc: 'All metrics nominal' },
  { id: 'overheating', label: 'Engine Overheat', desc: 'Temp > 120°C, vibration high' },
  { id: 'low_tyre', label: 'Low Tyre Pressure', desc: 'Front-Left tyre at 21 PSI' },
  { id: 'low_battery', label: 'Low Battery', desc: 'Voltage drops to 11.2V' },
  { id: 'overspeeding', label: 'Overspeeding', desc: 'Speed reaches 118 km/h' },
  { id: 'collision', label: 'Collision Impact', desc: 'Sudden stop & impact event' },
];

export function DemoPanel() {
  const isDemoEnabled = import.meta.env.VITE_DEMO === '1';
  const [activeScenario, setActiveScenario] = useState('normal');
  const [isTriggering, setIsTriggering] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isDemoEnabled) {
    return null;
  }

  const handleSelectScenario = async (scenarioId) => {
    setIsTriggering(true);
    setStatusMessage(null);
    try {
      await triggerDemoScenario(scenarioId);
      setActiveScenario(scenarioId);
      setStatusMessage({ type: 'success', text: `Telemetry switched to: ${scenarioId.toUpperCase()}` });
    } catch (err) {
      console.error('Failed to trigger scenario:', err);
      const msg = err.status === 403
        ? 'Backend DEMO_MODE=1 is not enabled. Run backend with DEMO_MODE=1.'
        : (err.message || 'Failed to switch scenario.');
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <aside className="demo-panel" aria-label="Demo Telemetry Controls">
      <div className="demo-panel-header">
        <div className="demo-title-wrap">
          <span className="demo-badge">DEV TOOL</span>
          <h4>Telemetry Simulator</h4>
        </div>
        <button
          className="demo-toggle-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'Collapse Demo Panel' : 'Expand Demo Panel'}
        >
          {isExpanded ? '▲ Hide' : '▼ Scenarios'}
        </button>
      </div>

      {isExpanded && (
        <div className="demo-panel-body">
          <p className="demo-hint">
            Simulate realistic hardware faults to test alerts, speech synthesis, and health scoring.
          </p>

          <div className="demo-buttons-grid">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                className={`demo-btn ${activeScenario === sc.id ? 'active' : ''}`}
                onClick={() => handleSelectScenario(sc.id)}
                disabled={isTriggering}
              >
                <span className="demo-btn-label">{sc.label}</span>
                <span className="demo-btn-desc">{sc.desc}</span>
              </button>
            ))}
          </div>

          {statusMessage && (
            <div className={`demo-status-pill ${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
