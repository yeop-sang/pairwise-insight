import { useState, useCallback, useRef, useEffect } from 'react';

interface TimeStamps {
  shownAtClient: Date;
  shownAtServer: Date;
  submittedAtClient: Date | null;
  submittedAtServer: Date | null;
  focusWindowAt: Date | null;
  focusInteractionAt: Date | null;
  focusToClickMs: number | null;
  comparisonTimeMs: number | null;
}

interface UseTimeTrackingProps {
  onFocusEvent?: (type: 'window' | 'interaction', timestamp: Date) => void;
}

export const useTimeTracking = ({ onFocusEvent }: UseTimeTrackingProps = {}) => {
  const [timeStamps, setTimeStamps] = useState<TimeStamps>({
    shownAtClient: new Date(),
    shownAtServer: new Date(),
    submittedAtClient: null,
    submittedAtServer: null,
    focusWindowAt: null,
    focusInteractionAt: null,
    focusToClickMs: null,
    comparisonTimeMs: null,
  });

  const hasInteractionStarted = useRef(false);
  const hasFocusEventOccurred = useRef(false);

  // Initialize shown timestamps
  const initializeShown = useCallback(() => {
    const now = new Date();
    setTimeStamps(prev => ({
      ...prev,
      shownAtClient: now,
      shownAtServer: now, // Server will override this
      submittedAtClient: null,
      submittedAtServer: null,
      focusWindowAt: null,
      focusInteractionAt: null,
      focusToClickMs: null,
      comparisonTimeMs: null,
    }));
    hasInteractionStarted.current = false;
    hasFocusEventOccurred.current = false;
  }, []);

  // Handle window focus events
  const handleWindowFocus = useCallback(() => {
    if (hasFocusEventOccurred.current) return;
    
    const now = new Date();
    setTimeStamps(prev => {
      const newState = {
        ...prev,
        focusWindowAt: now,
      };
      onFocusEvent?.('window', now);
      return newState;
    });
    hasFocusEventOccurred.current = true;
  }, [onFocusEvent]);

  // Handle interaction events
  const handleInteraction = useCallback((event: Event) => {
    if (hasInteractionStarted.current) return;

    const now = new Date();
    setTimeStamps(prev => {
      const newState = {
        ...prev,
        focusInteractionAt: now,
      };
      onFocusEvent?.('interaction', now);
      return newState;
    });
    hasInteractionStarted.current = true;
  }, [onFocusEvent]);

  // Handle submission - returns calculated values immediately
  const handleSubmission = useCallback(() => {
    const submittedAt = new Date();
    
    // Calculate values synchronously before state update
    const focusAt = Math.max(
      timeStamps.focusWindowAt?.getTime() || 0,
      timeStamps.focusInteractionAt?.getTime() || 0
    );
    
    const focusToClickMs = focusAt > 0 ? submittedAt.getTime() - focusAt : null;
    const comparisonTimeMs = submittedAt.getTime() - timeStamps.shownAtClient.getTime();

    // Update state
    setTimeStamps(prev => ({
      ...prev,
      submittedAtClient: submittedAt,
      submittedAtServer: submittedAt, // Server will override this
      focusToClickMs,
      comparisonTimeMs,
    }));
    
    // Return calculated values immediately (not waiting for state update)
    return {
      ...timeStamps,
      submittedAtClient: submittedAt,
      submittedAtServer: submittedAt,
      focusToClickMs,
      comparisonTimeMs,
    };
  }, [timeStamps]);

  // Set up event listeners
  useEffect(() => {
    // Window focus events
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleWindowFocus();
      }
    };

    const handleWindowFocusEvent = () => {
      handleWindowFocus();
    };

    // Interaction events (priority order)
    const interactionEvents = [
      'pointerdown',
      'touchstart', 
      'keydown',
      'pointerenter',
      'mousemove'
    ];

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocusEvent);
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleInteraction, { passive: true });
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocusEvent);
      
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleInteraction);
      });
    };
  }, [handleWindowFocus, handleInteraction]);

  return {
    timeStamps,
    initializeShown,
    handleSubmission,
    resetTracking: () => {
      hasInteractionStarted.current = false;
      hasFocusEventOccurred.current = false;
    }
  };
};