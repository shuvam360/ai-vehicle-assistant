import React from 'react';

/**
 * Microphone button component with 4 driver cockpit states:
 * - 'idle': Ready to listen
 * - 'listening': Capturing microphone speech with active soundwave animation
 * - 'thinking': Waiting for backend query evaluation
 * - 'speaking': SpeechSynthesis voice playback with click-to-interrupt
 */
export function MicButton({ state = 'idle', onClick, disabled = false, interimTranscript = '' }) {
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  const getButtonLabel = () => {
    switch (state) {
      case 'listening':
        return 'LISTENING...';
      case 'thinking':
        return 'THINKING...';
      case 'speaking':
        return 'SPEAKING (TAP TO STOP)';
      default:
        return 'TAP TO SPEAK';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'listening':
        return '🎙️';
      case 'thinking':
        return '🧠';
      case 'speaking':
        return '🔊';
      default:
        return '🎙️';
    }
  };

  return (
    <div className="mic-control-center">
      <div className={`mic-button-wrapper state-${state}`}>
        {/* Animated concentric pulse rings */}
        <div className="mic-outer-ring ring-1"></div>
        <div className="mic-outer-ring ring-2"></div>
        {isListening && <div className="mic-outer-ring ring-listening"></div>}
        {isSpeaking && <div className="mic-outer-ring ring-speaking"></div>}

        <button
          id="assistant-mic-button"
          type="button"
          className={`mic-core-button ${state}`}
          onClick={onClick}
          disabled={disabled || isThinking}
          title={isSpeaking ? 'Click to stop speaking' : isListening ? 'Click to finish' : 'Click to speak'}
          aria-label={getButtonLabel()}
        >
          <span className="mic-icon">{getIcon()}</span>
        </button>
      </div>

      {/* State Badge */}
      <div className={`mic-state-badge badge-${state}`}>
        <span className="state-dot"></span>
        <span className="state-text">{getButtonLabel()}</span>
      </div>

      {/* Interim live speech transcript preview */}
      {isListening && interimTranscript && (
        <div className="live-transcript-preview">
          <span className="transcript-live-label">LIVE:</span>
          <span className="transcript-text">"{interimTranscript}"</span>
        </div>
      )}
    </div>
  );
}
