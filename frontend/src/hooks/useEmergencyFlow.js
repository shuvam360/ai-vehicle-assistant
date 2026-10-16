import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook managing the 10-second "Are you okay?" emergency flow when an EMERGENCY alert appears.
 */
export function useEmergencyFlow(activeAlerts = []) {
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyStep, setEmergencyStep] = useState('prompt'); // 'prompt' | 'escalated' | 'resolved'
  const [countdown, setCountdown] = useState(10);

  const countdownTimerRef = useRef(null);
  const handledEmergencyIdsRef = useRef(new Set());
  const recognitionRef = useRef(null);

  const speakPrompt = useCallback((text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Emergency speech synthesis failed:', err);
      }
    }
  }, []);

  const handleConfirmSafe = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setEmergencyStep('resolved');
    speakPrompt('Emergency response acknowledged: Driver confirmed safe.');
  }, [speakPrompt]);

  const handleEscalate = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setEmergencyStep('escalated');
    speakPrompt('Emergency escalation active. Transmitting telemetry to rescue services.');
  }, [speakPrompt]);

  const handleDismiss = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setEmergencyModalOpen(false);
  }, []);

  useEffect(() => {
    if (!activeAlerts || !Array.isArray(activeAlerts)) return;

    const currentEmergencyIds = new Set(
      activeAlerts.filter((a) => a.severity === 'EMERGENCY').map((a) => a.id)
    );

    // Forget emergency IDs when they clear
    for (const id of handledEmergencyIdsRef.current) {
      if (!currentEmergencyIds.has(id)) {
        handledEmergencyIdsRef.current.delete(id);
      }
    }

    const emergencyAlert = activeAlerts.find((a) => a.severity === 'EMERGENCY');
    if (emergencyAlert && !handledEmergencyIdsRef.current.has(emergencyAlert.id)) {
      handledEmergencyIdsRef.current.add(emergencyAlert.id);

      // Trigger flow
      setEmergencyModalOpen(true);
      setEmergencyStep('prompt');
      setCountdown(10);

      speakPrompt('Are you okay?');

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            setEmergencyStep('escalated');
            speakPrompt('No driver response received. Emergency escalation activated.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Listen for voice response
      const SpeechRecognition =
        typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : null;

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = 'en-US';
          rec.continuous = false;
          rec.interimResults = false;

          rec.onresult = (e) => {
            const transcript = (e.results[0]?.[0]?.transcript || '').toLowerCase();
            if (
              transcript.includes('yes') ||
              transcript.includes('okay') ||
              transcript.includes('ok') ||
              transcript.includes('fine') ||
              transcript.includes('safe')
            ) {
              handleConfirmSafe();
            } else if (
              transcript.includes('no') ||
              transcript.includes('help') ||
              transcript.includes('hurt') ||
              transcript.includes('pain')
            ) {
              handleEscalate();
            }
          };

          recognitionRef.current = rec;
          rec.start();
        } catch {
          // ignore
        }
      }
    }
  }, [activeAlerts, speakPrompt, handleConfirmSafe, handleEscalate]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    emergencyModalOpen,
    emergencyStep,
    countdown,
    handleConfirmSafe,
    handleEscalate,
    handleDismiss,
  };
}
