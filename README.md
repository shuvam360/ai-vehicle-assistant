# 🚗 AI Vehicle Assistant & Cockpit HUD

An intelligent connected-vehicle assistant system featuring a Flask telemetry & diagnostic backend and a real-time driver-facing React (Vite) Cockpit HUD.

---

## 🛠️ Project Architecture

- **Backend (`app.py`, `services/`)**: Flask REST API providing real-time telemetry simulation, mechanical health scoring, driving risk analysis, prioritized alerts, OSRM alternative navigation, and NLP intent detection.
- **Frontend (`frontend/`)**: React + Vite driver HUD with dark cockpit aesthetics, live gauges, global alert banners with text-to-speech, and scenario injection controls.

---

## ⚡ Quickstart Setup Guide

### 1. Backend Setup (Flask)
```powershell
# Navigate to the project root
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\automotive_assistent-main"

# Copy environment template
cp .env.example .env

# Set environment variables for demo mode & security
$env:API_KEY="test-api-key"
$env:DEMO_MODE="1"
$env:FLASK_DEBUG="true"

# Start the Flask API server
python app.py
```
*Backend runs on `http://127.0.0.1:5000`.*

---

### 2. Frontend Setup (React + Vite)
```powershell
# Navigate to the frontend directory
cd "c:\Users\SHUVAM DIKSHIT\OneDrive\Desktop\automotive_assistent-main\frontend"

# Copy environment configuration
cp .env.example .env

# Start the Vite development server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🎭 End-to-End Demo Script

When running with `VITE_DEMO=1` and `DEMO_MODE=1`, open the **Telemetry Simulator (DEV TOOL)** panel in the bottom-right corner to test the full lifecycle:

| Step | Scenario | Expected System Behavior | Voice Query to Test |
| :---: | :--- | :--- | :--- |
| **1** | **`normal`** | Overall health score: **100% (HEALTHY)**. All 4 tyres at 32 PSI. Status bulb green. | *"How is my car health?"* &rarr; Reports 100% healthy. |
| **2** | **`low_tyre`** | Front-Left tyre drops to **21 PSI**. Health score drops. Amber `WARNING` alert triggers: *"Tyre pressure is low."* announced aloud via SpeechSynthesis. | *"Any risks?"* &rarr; TTS reports low tyre pressure concern. |
| **3** | **`overheating`** | Engine temperature rises to **124°C**, vibration spikes. Crimson `CRITICAL` alert triggers: *"Engine temperature is critically high. Please stop safely."* announced aloud. | *"Is it safe to drive?"* &rarr; TTS alerts driver to stop vehicle immediately. |
| **4** | **`collision`** | Vehicle speed drops to 0, impact sensor trips. Flashing red `EMERGENCY` banner triggers: *"Possible collision detected. Are you okay?"* announced aloud. | *"Any alerts?"* &rarr; Confirms active collision emergency. |
| **5** | **`normal`** | Return to normal baseline. Alerts automatically clear from the banner and speech tracker resets. | *"How is my vehicle?"* &rarr; Confirms all systems nominal. |

---

## 📦 Implementation Phases

- [x] **PHASE A: Shell, Global Alerts, and Health Dashboard**
  - `usePolling` hook with tab visibility pause and connection-lost tracking.
  - `AlertBanner`: 1.5s polling, color coding (`WARNING` yellow, `CRITICAL` red, `EMERGENCY` flashing red), first-time SpeechSynthesis announcement, and mute toggle.
  - `HealthDashboard`: Overall integrity gauge, 4 component bars (Engine, Battery, Brakes, Tyres), 4-tyre quadrant layout, live metrics grid, warnings line.
  - `DemoPanel`: 6 scenario injection buttons gated to `VITE_DEMO=1`.
- [x] **PHASE B: Safety Dashboard**
  - Risk level badge: `LOW` (green), `MEDIUM` (yellow), `HIGH` (orange), `CRITICAL` (pulsing red) with dynamic glow and telemetry chips.
  - Flags list: Driver & vehicle diagnostics separating active hazard warnings (`⚠️`/`🚨`) from passed checks (`✓`).
  - Recent Events timeline: Auto-refreshing "hard braking, 2 min ago" relative timestamp format with dynamic elapsed counter.
  - Resilient states: Loading scanner, connection-lost reconnection banner, empty states for flags/events.
- [x] **PHASE C: Navigation Dashboard (Leaflet + OpenStreetMap + OSRM)**
  - Interactive Leaflet map with OpenStreetMap tiles, dark popups, auto-fitting bounds, and custom start/end pins.
  - Multi-route visualization: Primary route drawn as solid cyan line (`#06b6d4`), alternatives drawn as lighter dashed lines (`#94a3b8`).
  - Route telemetry: Primary and alternative distance/duration, dynamic traffic flow pill (`LIGHT`, `MODERATE`, `HEAVY`), and "Simulated data" badge when `mock=true`.
  - Search input with quick destination chips (Hospital, Airport, Station, Fuel, and unresolvable test "The Moon").
  - Prominent "Destination not found" error banner with clear recovery instructions.
- [ ] **PHASE D: Voice Assistant Dashboard (Web Speech + Emergency Flow)**


