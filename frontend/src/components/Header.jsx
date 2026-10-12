import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'assistant', label: 'Voice Assistant', icon: '🎙️' },
  { id: 'navigation', label: 'Navigation & Route', icon: '🗺️' },
  { id: 'health', label: 'Vehicle Health', icon: '🩺' },
  { id: 'safety', label: 'Safety & Events', icon: '🛡️' },
];

export function Header({ activeTab, onSelectTab, connectionStatus }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-wrap">
          <span className="brand-logo">⚡</span>
          <div className="brand-text">
            <h1 className="brand-title">AI VEHICLE ASSISTANT</h1>
            <span className="brand-sub">COCKPIT TELEMETRY &amp; NAVIGATION HUD</span>
          </div>
        </div>

        <div className="header-status-wrap">
          <div className="clock-display">
            <span className="clock-icon">🕒</span>
            <span className="clock-time">{timeStr}</span>
          </div>

          <div className="system-status-indicator">
            <span
              className={`status-bulb ${connectionStatus === 'offline' ? 'offline' : 'online'}`}
            ></span>
            <span className="status-label">
              {connectionStatus === 'offline' ? 'BACKEND OFFLINE' : 'SYSTEM ONLINE'}
            </span>
          </div>
        </div>
      </div>

      <nav className="tab-navigation-bar" aria-label="Main Dashboards">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              aria-selected={isActive}
              role="tab"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
