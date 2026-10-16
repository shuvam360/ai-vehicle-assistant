import React from 'react';

/**
 * Extracts destination string from query or response for navigation handoff.
 */
function extractDestinationForButton(userText, assistantText) {
  const combined = (userText || '') + ' ' + (assistantText || '');
  const match = combined.match(/(?:navigate to|take me to|go to|get me to|route to|directions to)\s+([a-zA-Z0-9\s]+?)(?:[.,?!]|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Check known keywords
  const lower = combined.toLowerCase();
  if (lower.includes('hospital')) return 'hospital';
  if (lower.includes('airport')) return 'airport';
  if (lower.includes('station')) return 'station';
  if (lower.includes('fuel') || lower.includes('gas')) return 'fuel';
  return (userText || '').replace(/[?.!,]/g, '').trim();
}

export function ChatLog({ messages = [], onNavigate, onReplaySpeech }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="chat-log-card empty-chat-card">
        <span className="empty-chat-icon">💬</span>
        <h3>Voice Dialogue Inactive</h3>
        <p>Press the microphone button or type a prompt below to interact with your vehicle co-pilot.</p>
        <span className="empty-hint">Try: "How is my car health?", "Is it safe to drive?", or "Navigate to nearest hospital"</span>
      </div>
    );
  }

  return (
    <div className="chat-log-card">
      <div className="chat-log-header">
        <h3 className="chat-title">Conversation History</h3>
        <span className="message-count-badge">{messages.length} messages</span>
      </div>

      <div className="chat-messages-container">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isNavIntent = msg.intent === 'NAVIGATION';
          const destination = isNavIntent ? extractDestinationForButton(msg.userQuery, msg.text) : '';

          return (
            <div
              key={msg.id || `msg-${index}`}
              className={`chat-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}
            >
              <div className="bubble-avatar">
                {isUser ? '👤' : '🤖'}
              </div>

              <div className="bubble-content-wrap">
                <div className="bubble-meta">
                  <span className="sender-name">{isUser ? 'Driver' : 'Vehicle Co-Pilot'}</span>
                  {msg.timestamp && <span className="bubble-time">{msg.timestamp}</span>}
                  {msg.intent && (
                    <span className={`intent-badge intent-${msg.intent.toLowerCase()}`}>
                      {msg.intent}
                    </span>
                  )}
                </div>

                <div className={`chat-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                  <p className="bubble-text">{msg.text}</p>

                  {/* If assistant and has speech replay callback */}
                  {!isUser && onReplaySpeech && (
                    <button
                      type="button"
                      className="replay-speech-btn"
                      onClick={() => onReplaySpeech(msg.text)}
                      title="Speak response aloud again"
                    >
                      🔊 Speak again
                    </button>
                  )}
                </div>

                {/* Navigation Hand-off Action Button */}
                {!isUser && isNavIntent && onNavigate && destination && (
                  <div className="nav-action-handoff">
                    <button
                      type="button"
                      className="open-nav-btn"
                      onClick={() => onNavigate(destination)}
                    >
                      <span>🗺️</span>
                      <span>Open Navigation & Route to <strong>"{destination}"</strong></span>
                      <span className="arrow-icon">➔</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
