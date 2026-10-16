import React, { useState, useEffect } from 'react';

/**
 * Converts seconds into a human-readable relative time string.
 */
export function formatRelativeTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const minutes = Math.floor(s / 60);
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * Formats event type into a driver-friendly title, e.g. "hard_braking" -> "Hard braking".
 */
export function formatEventName(eventType) {
  if (!eventType) return 'Driving event';
  const clean = eventType.replace(/_/g, ' ').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Returns an appropriate icon for an event type.
 */
function getEventIcon(eventType) {
  switch ((eventType || '').toLowerCase()) {
    case 'collision':
      return '🚨';
    case 'hard_braking':
      return '⚡';
    case 'overspeeding':
      return '🏎️';
    default:
      return '📌';
  }
}

export function RecentEvents({ events = [], lastFetchedAt = Date.now() }) {
  // Local timer ticking every 2.5 seconds to keep relative time strings fresh
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const now = Date.now();
  const elapsedSinceFetch = (now - lastFetchedAt) / 1000;

  if (!events || events.length === 0) {
    return (
      <div className="safety-section-card">
        <div className="section-header-wrap">
          <h3 className="section-title">Recent Driving Events</h3>
          <span className="live-pulse-badge">LIVE MONITORING</span>
        </div>
        <div className="empty-state-card">
          <span className="empty-icon">🛣️</span>
          <p className="empty-title">No Incident Events Logged</p>
          <span className="empty-subtitle">
            Vehicle operating smoothly with zero recorded driving violations or mechanical shocks.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="safety-section-card">
      <div className="section-header-wrap">
        <div className="section-title-group">
          <h3 className="section-title">Recent Driving Events</h3>
          <span className="events-count-pill">{events.length} recorded</span>
        </div>
        <div className="live-status-indicator">
          <span className="pulse-dot"></span>
          <span className="pulse-label">AUTO-REFRESHING</span>
        </div>
      </div>

      <div className="events-timeline">
        {events.map((event) => {
          const effectiveSeconds = Math.max(0, (event.seconds_ago || 0) + elapsedSinceFetch);
          const timeText = formatRelativeTime(effectiveSeconds);
          const eventTitle = formatEventName(event.event_type);
          const isCritical = event.event_type === 'collision';
          const isWarning = event.event_type === 'hard_braking' || event.event_type === 'overspeeding';

          return (
            <div
              key={event.id || `${event.event_type}-${event.created_at}`}
              className={`event-timeline-item ${isCritical ? 'event-critical' : isWarning ? 'event-warning' : ''}`}
            >
              <div className="event-icon-badge">
                {getEventIcon(event.event_type)}
              </div>

              <div className="event-details">
                <div className="event-headline">
                  {/* Exact requested format: "hard braking, 2 min ago" */}
                  <span className="event-main-phrase">
                    <strong className="event-type-name">{eventTitle}</strong>, <span className="event-rel-time">{timeText}</span>
                  </span>
                  <span className="event-tag-badge">
                    {event.event_type.toUpperCase()}
                  </span>
                </div>

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}

                <div className="event-meta">
                  <span className="event-timestamp">{event.created_at}</span>
                  <span className="event-id">ID #{event.id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
