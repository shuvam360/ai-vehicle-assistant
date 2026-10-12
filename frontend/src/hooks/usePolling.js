import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom polling hook that:
 * 1. Executes an async query at specified interval (e.g. 1500ms).
 * 2. Pauses when the browser tab is hidden (document.visibilityState === 'hidden').
 * 3. Cleans up intervals and listeners on unmount.
 * 4. Manages connection lost state when network or API fails.
 */
export function usePolling(fn, intervalMs = 1500, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const intervalIdRef = useRef(null);

  const execute = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fnRef.current();
      setData(result);
      setError(null);
      setIsConnectionLost(false);
    } catch (err) {
      console.warn('Polling error:', err);
      setError(err);
      setIsConnectionLost(true);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const startTimer = () => {
      stopTimer();
      intervalIdRef.current = setInterval(() => {
        if (document.visibilityState !== 'hidden') {
          execute();
        }
      }, intervalMs);
    };

    const stopTimer = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        execute();
        startTimer();
      } else {
        stopTimer();
      }
    };

    // Initial immediate fetch
    execute();
    startTimer();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled, execute]);

  return {
    data,
    error,
    isConnectionLost,
    isLoading,
    refetch: execute,
  };
}
