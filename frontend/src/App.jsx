import React, { useState } from 'react';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { HealthDashboard } from './components/HealthDashboard';
import { SafetyDashboard } from './components/SafetyDashboard';
import { NavigationDashboard } from './components/NavigationDashboard';
import { AssistantDashboard } from './components/AssistantDashboard';
import { DemoPanel } from './components/DemoPanel';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('health');
  const [activeAlerts, setActiveAlerts] = useState([]);

  return (
    <div className="cockpit-app-root">
      {/* GLOBAL HEADER */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* GLOBAL ALERT BANNER (MOUNTED ABOVE TABS / SCREENS) */}
      <AlertBanner onAlertsUpdate={setActiveAlerts} />

      {/* MAIN COCKPIT VIEWPORT */}
      <main className="cockpit-viewport">
        {activeTab === 'health' && <HealthDashboard />}
        {activeTab === 'safety' && <SafetyDashboard />}
        {activeTab === 'navigation' && <NavigationDashboard />}
        {activeTab === 'assistant' && <AssistantDashboard />}
      </main>

      {/* DEMO CONTROL PANEL (VISIBLE ONLY WHEN VITE_DEMO=1) */}
      <DemoPanel />
    </div>
  );
}
