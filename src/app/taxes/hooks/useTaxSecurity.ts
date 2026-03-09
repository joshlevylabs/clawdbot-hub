import { useState, useEffect, useCallback } from 'react';

const TAX_SESSION_KEY = 'tax_session_token';
const TAX_SESSION_EXPIRY_KEY = 'tax_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface TaxSecurityState {
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionTimeRemaining: number; // in seconds
}

export const useTaxSecurity = () => {
  const [state, setState] = useState<TaxSecurityState>({
    isAuthenticated: false,
    isLoading: true,
    sessionTimeRemaining: 0,
  });

  // Check if session is valid
  const isSessionValid = useCallback((): boolean => {
    const token = sessionStorage.getItem(TAX_SESSION_KEY);
    const expiry = sessionStorage.getItem(TAX_SESSION_EXPIRY_KEY);
    
    if (!token || !expiry) return false;
    
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    
    if (now >= expiryTime) {
      // Session expired, clear it
      clearSession();
      return false;
    }
    
    return true;
  }, []);

  // Set session token
  const setSession = useCallback((token: string): void => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    sessionStorage.setItem(TAX_SESSION_KEY, token);
    sessionStorage.setItem(TAX_SESSION_EXPIRY_KEY, expiry.toString());
  }, []);

  // Clear session
  const clearSession = useCallback((): void => {
    sessionStorage.removeItem(TAX_SESSION_KEY);
    sessionStorage.removeItem(TAX_SESSION_EXPIRY_KEY);
  }, []);

  // Get session token for API calls
  const getSessionToken = useCallback((): string | null => {
    if (!isSessionValid()) return null;
    return sessionStorage.getItem(TAX_SESSION_KEY);
  }, [isSessionValid]);

  // Calculate remaining time
  const getTimeRemaining = useCallback((): number => {
    const expiry = sessionStorage.getItem(TAX_SESSION_EXPIRY_KEY);
    if (!expiry) return 0;
    
    const expiryTime = parseInt(expiry);
    const remaining = Math.max(0, expiryTime - Date.now());
    return Math.floor(remaining / 1000); // Convert to seconds
  }, []);

  // Extend session (reset the timer)
  const extendSession = useCallback((): void => {
    const token = sessionStorage.getItem(TAX_SESSION_KEY);
    if (token && isSessionValid()) {
      setSession(token);
    }
  }, [isSessionValid, setSession]);

  // Lock the session
  const lockSession = useCallback((): void => {
    clearSession();
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      sessionTimeRemaining: 0,
    }));
  }, [clearSession]);

  // Authenticate user
  const authenticate = useCallback((token?: string): void => {
    const sessionToken = token || `tax_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setSession(sessionToken);
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isLoading: false,
    }));
  }, [setSession]);

  // Initialize session state
  useEffect(() => {
    const checkSession = () => {
      const isValid = isSessionValid();
      const timeRemaining = getTimeRemaining();
      
      setState(prev => ({
        ...prev,
        isAuthenticated: isValid,
        isLoading: false,
        sessionTimeRemaining: timeRemaining,
      }));
    };

    checkSession();
  }, [isSessionValid, getTimeRemaining]);

  // Update session time remaining every minute
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const timer = setInterval(() => {
      const timeRemaining = getTimeRemaining();
      setState(prev => ({
        ...prev,
        sessionTimeRemaining: timeRemaining,
      }));

      // Auto-lock if session expired
      if (timeRemaining <= 0) {
        lockSession();
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [state.isAuthenticated, getTimeRemaining, lockSession]);

  // Activity tracking for session extension
  useEffect(() => {
    if (!state.isAuthenticated) return;

    let lastActivity = Date.now();
    const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastActivity > ACTIVITY_THRESHOLD) {
        extendSession();
        lastActivity = now;
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [state.isAuthenticated, extendSession]);

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Optionally clear session on page close
      // clearSession();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, could be a good time to start countdown for auto-lock
      } else {
        // Page is visible again, refresh session check
        if (!isSessionValid()) {
          lockSession();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSessionValid, lockSession]);

  return {
    ...state,
    authenticate,
    lockSession,
    extendSession,
    getSessionToken,
    clearSession,
    // Utility functions
    formatTimeRemaining: (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
  };
};