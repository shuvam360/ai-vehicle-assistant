import React, { useState, useEffect, useRef, useCallback } from 'react';
import { queryAssistant } from '../api';
import { MicButton } from './MicButton';
import { ChatLog } from './ChatLog';
import { EmergencyEscalationModal } from './EmergencyEscalationModal';

const SUGGESTED_QUERIES = [
  { label: '🩺 Car health', text: 'How is my car health?' },
  { label: '🛡️ Driving safety', text: 'Is it safe to drive?' },
  { label: '🚨 Active alerts', text: 'Any alerts?' },
  { label: '🏥 Hospital route', text: 'Navigate to nearest hospital' },
  { label: '✈️ Airport route', text: 'Take me to airport' },
];

export function AssistantDashboard({ onNavigate, activeAlerts = [] }) {
  const [assistantState, setAssistantState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Cockpit Voice Co-Pilot online. Tap the microphone or select a prompt to begin.',
      intent: 'GENERAL',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Check Web Speech API support
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const isSpeechSupported = Boolean(SpeechRecognition);

  const recognitionRef = useRef(null);
  const currentUtteranceRef = useRef(null);

  // Emergency Flow state
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyStep, setEmergencyStep] = useState('prompt'); // 'prompt' | 'escalated' | 'resolved'
  const [countdown, setCountdown] = useState(10);
  const countdownTimerRef = useRef(null);
  const handledEmergencyIdsRef = useRef(new Set());

  // Function to stop current voice output
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAssistantState('idle');
  }, []);

  // Text-to-Speech speaking helper
  const speakText = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAssistantState('idle');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      currentUtteranceRef.current = utterance;

      utterance.onstart = () => {
        setAssistantState('speaking');
      };

      utterance.onend = () => {
        setAssistantState('idle');
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setAssistantState('idle');
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis call failed:', err);
      setAssistantState('idle');
    }
  }, []);

  // Submit query to backend
  const handleSendQuery = async (queryText) => {
    const textToSend = (queryText || textInput).trim();
    if (!textToSend) return;

    setTextInput('');
    setInterimTranscript('');
    setErrorMessage('');
    setAssistantState('thinking');

    // Add user message to log
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: nowTime,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const data = await queryAssistant(textToSend);
      const replyText = data?.response || 'I did not receive a response from vehicle telemetry.';
      const detectedIntent = data?.intent || 'GENERAL';

      const assistantMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        intent: detectedIntent,
        userQuery: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak reply aloud with speechSynthesis
      speakText(replyText);
    } catch (err) {
      console.warn('Assistant query error:', err);
      const errMsg = err.data?.message || err.message || 'Unable to connect to assistant service.';
      setErrorMessage(errMsg);
      setAssistantState('idle');

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: 'assistant',
          text: `Error: ${errMsg}`,
          intent: 'ERROR',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Start microphone speech recognition
  const startListening = () => {
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setAssistantState('listening');
        setInterimTranscript('');
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalTranscript = res[0].transcript;
            setInterimTranscript(finalTranscript);
            handleSendQuery(finalTranscript);
            return;
          } else {
            interim += res[0].transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionDenied(true);
          setErrorMessage('Microphone permission was denied. Please allow microphone access or use text input.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setAssistantState('idle');
      };

      recognition.onend = () => {
        setAssistantState((prev) => (prev === 'listening' ? 'idle' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start recognition:', err);
      setErrorMessage('Failed to start microphone service.');
      setAssistantState('idle');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setAssistantState('idle');
  };

  // Mic Button Click Handler
  const handleMicClick = () => {
    if (assistantState === 'speaking') {
      stopSpeaking();
    } else if (assistantState === 'listening') {
      stopListening();
    } else if (assistantState === 'idle') {
      startListening();
    }
  };

  // =========================================================================
  // EMERGENCY FLOW: Triggered when an EMERGENCY alert appears
  // =========================================================================
  const handleEmergencyConfirmation = (isSafe) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (isSafe) {
      setEmergencyStep('resolved');
      speakText('Emergency response acknowledged: Driver confirmed safe.');
    } else {
      setEmergencyStep('escalated');
      speakText('Emergency escalation active. Transmitting coordinates to highway rescue.');
    }
  };

  // Check for emergency alerts in activeAlerts
  useEffect(() => {
    if (!activeAlerts || !Array.isArray(activeAlerts)) return;

    const emergencyAlert = activeAlerts.find((a) => a.severity === 'EMERGENCY');
    if (emergencyAlert && !handledEmergencyIdsRef.current.has(emergencyAlert.id)) {
      handledEmergencyIdsRef.current.add(emergencyAlert.id);

      // 1. Open Emergency Modal in Prompt Step
      setEmergencyModalOpen(true);
      setEmergencyStep('prompt');
      setCountdown(10);

      // 2. Speak "Are you okay?" aloud
      speakText('Are you okay?');

      // 3. Start 10-second countdown
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            // No answer -> Escalate automatically
            setEmergencyStep('escalated');
            speakText('No driver response received. Emergency escalation activated.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 4. Try listening for driver response (e.g. "yes", "okay", "fine", "no", "help")
      if (SpeechRecognition) {
        try {
          const emergencyRecognition = new SpeechRecognition();
          emergencyRecognition.lang = 'en-US';
          emergencyRecognition.continuous = false;
          emergencyRecognition.interimResults = false;

          emergencyRecognition.onresult = (e) => {
            const reply = (e.results[0]?.[0]?.transcript || '').toLowerCase();
            if (
              reply.includes('yes') ||
              reply.includes('okay') ||
              reply.includes('ok') ||
              reply.includes('fine') ||
              reply.includes('safe')
            ) {
              handleEmergencyConfirmation(true);
            } else if (
              reply.includes('no') ||
              reply.includes('help') ||
              reply.includes('hurt') ||
              reply.includes('pain')
            ) {
              handleEmergencyConfirmation(false);
            }
          };

          emergencyRecognition.start();
        } catch {
          // ignore
        }
      }
    }
  }, [activeAlerts, SpeechRecognition, speakText]);

  // Clean up timers & speech on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="assistant-dashboard-container">
      {/* Emergency Escalation Modal */}
      <EmergencyEscalationModal
        isOpen={emergencyModalOpen}
        step={emergencyStep}
        countdown={countdown}
        onConfirmSafe={() => handleEmergencyConfirmation(true)}
        onEscalate={() => handleEmergencyConfirmation(false)}
        onDismiss={() => {
          setEmergencyModalOpen(false);
          stopSpeaking();
        }}
      />

      {/* Top Banner Notice for Missing Speech Recognition or Mic Permission */}
      {!isSpeechSupported && (
        <div className="assistant-notice-banner warning-notice">
          <span className="notice-icon">ℹ️</span>
          <div className="notice-content">
            <strong>Speech Recognition Unavailable:</strong> Web Speech API is not supported in this browser (e.g. Firefox). You can interact seamlessly using the text input below.
          </div>
        </div>
      )}

      {micPermissionDenied && (
        <div className="assistant-notice-banner error-notice">
          <span className="notice-icon">⚠️</span>
          <div className="notice-content">
            <strong>Microphone Access Denied:</strong> Please enable microphone access in your browser settings to speak, or use the text prompt below.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="assistant-notice-banner error-notice">
          <span className="notice-icon">⚠️</span>
          <div className="notice-content">{errorMessage}</div>
          <button type="button" className="dismiss-notice-btn" onClick={() => setErrorMessage('')}>
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Interactive Mic & Voice Controls on Left, Dialogue Log on Right */}
      <div className="assistant-layout-grid">
        <div className="assistant-controls-column">
          <div className="voice-station-card">
            <div className="station-header">
              <span className="station-tag">VOICE INTERACTION STATION</span>
              <h2 className="station-title">Vehicle Co-Pilot</h2>
            </div>

            {/* Central Interactive Mic Button */}
            <MicButton
              state={assistantState}
              onClick={handleMicClick}
              disabled={!isSpeechSupported}
              interimTranscript={interimTranscript}
            />

            {/* Suggested Driver Voice Prompts */}
            <div className="suggested-queries-section">
              <span className="suggested-label">RECOMMENDED COMMANDS:</span>
              <div className="suggested-chips-grid">
                {SUGGESTED_QUERIES.map((item, idx) => (
                  <button
                    key={`cmd-${idx}`}
                    type="button"
                    className="suggested-chip-btn"
                    onClick={() => handleSendQuery(item.text)}
                    disabled={assistantState === 'thinking'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Text Input Fallback Bar */}
            <form
              className="assistant-text-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
            >
              <input
                id="assistant-text-input"
                type="text"
                className="assistant-input-field"
                placeholder="Or type a voice command..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={assistantState === 'thinking'}
              />
              <button
                id="assistant-send-button"
                type="submit"
                className="assistant-send-btn"
                disabled={assistantState === 'thinking' || !textInput.trim()}
              >
                Send ➔
              </button>
            </form>
          </div>
        </div>

        {/* Conversation Dialogue Column */}
        <div className="assistant-dialogue-column">
          <ChatLog
            messages={messages}
            onNavigate={onNavigate}
            onReplaySpeech={speakText}
          />
        </div>
      </div>
    </div>
  );
}
