import React, { useState, useEffect } from 'react';
import { calculateNavigationRoute } from '../api';
import { RouteMap } from './RouteMap';
import { RouteDetails } from './RouteDetails';

const QUICK_DESTINATIONS = [
  { label: '🏥 Hospital', value: 'hospital' },
  { label: '✈️ Airport', value: 'airport' },
  { label: '🚆 Howrah Station', value: 'station' },
  { label: '⛽ Gas Station', value: 'fuel' },
  { label: '🚀 Moon (Test 404)', value: 'the moon' },
];

export function NavigationDashboard({ initialDestination = '' }) {
  const [destination, setDestination] = useState(initialDestination);
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update input if initialDestination changes (e.g. from Voice Assistant)
  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      handleCalculateRoute(initialDestination);
    }
  }, [initialDestination]);

  const handleCalculateRoute = async (targetDestination) => {
    const destToUse = (targetDestination !== undefined ? targetDestination : destination).trim();

    if (!destToUse) {
      setErrorMessage('Please enter a destination to navigate.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await calculateNavigationRoute(destToUse);
      if (data && data.status === 'ERROR') {
        setErrorMessage(data.message || 'Destination not found.');
        setRouteData(null);
      } else {
        setRouteData(data);
        setErrorMessage('');
      }
    } catch (err) {
      console.warn('Navigation route error:', err);
      // Backend returns 400 with { status: "ERROR", message: "Destination not found." }
      const backendMsg = err.data?.message || err.message;
      if (backendMsg && backendMsg.toLowerCase().includes('not found')) {
        setErrorMessage('Destination not found. Please verify the address, landmark, or city (e.g. Hospital, Airport, Howrah Station).');
      } else {
        setErrorMessage(backendMsg || 'Failed to calculate navigation route. Please check your connection.');
      }
      setRouteData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCalculateRoute();
  };

  const handleSelectQuickDest = (val) => {
    setDestination(val);
    handleCalculateRoute(val);
  };

  return (
    <div className="navigation-dashboard-container">
      {/* Search Input Bar with Quick Action Buttons */}
      <div className="nav-search-card">
        <form className="nav-search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              id="navigation-destination-input"
              type="text"
              className="nav-destination-input"
              placeholder="Where to? (e.g. Hospital, Airport, Howrah Station...)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={isLoading}
            />
            {destination && !isLoading && (
              <button
                type="button"
                className="clear-input-btn"
                onClick={() => {
                  setDestination('');
                  setErrorMessage('');
                }}
                title="Clear input"
              >
                ✕
              </button>
            )}
          </div>

          <button
            id="navigation-go-button"
            type="submit"
            className="nav-go-btn"
            disabled={isLoading || !destination.trim()}
          >
            {isLoading ? (
              <span className="btn-spinner-wrap">
                <span className="spinner-mini"></span>
                <span>Calculating...</span>
              </span>
            ) : (
              <span>GO ➔</span>
            )}
          </button>
        </form>

        {/* Quick Destination Chips */}
        <div className="quick-dest-row">
          <span className="quick-label">QUICK DESTINATIONS:</span>
          <div className="quick-chips-group">
            {QUICK_DESTINATIONS.map((item, idx) => (
              <button
                key={`quick-${idx}`}
                type="button"
                className="quick-chip-btn"
                onClick={() => handleSelectQuickDest(item.value)}
                disabled={isLoading}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prominent Error Notice when Destination not found */}
      {errorMessage && (
        <div className="nav-error-banner">
          <div className="nav-error-icon">⚠️</div>
          <div className="nav-error-content">
            <h4 className="nav-error-title">Route Calculation Notice</h4>
            <p className="nav-error-text">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="dismiss-error-btn"
            onClick={() => setErrorMessage('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Leaflet Map on the Left, Route Details on the Right */}
      <div className="nav-content-grid">
        <div className="nav-map-column">
          <RouteMap routeData={routeData} />
        </div>

        <div className="nav-details-column">
          <RouteDetails routeData={routeData} />
        </div>
      </div>
    </div>
  );
}
