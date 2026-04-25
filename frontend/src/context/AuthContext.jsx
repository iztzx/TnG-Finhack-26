import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { api } from '../lib/api';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = 'tng_token';
const USER_KEY = 'tng_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRedirect, setAuthRedirect] = useState(null);
  const expiryTimerRef = useRef(null);

  const clearError = () => setError(null);
  const clearAuthRedirect = () => setAuthRedirect(null);

  const isAdmin = userProfile?.role === 'admin';

  // ---- Token helpers ----
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const setSession = (token, profile) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser({ userId: profile.userId || profile.email, username: profile.email });
    setUserProfile(profile);
    scheduleExpiryWarning(token);
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setUserProfile(null);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
  };

  // ---- JWT decode helper ----
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // ---- Session expiry management ----
  const scheduleExpiryWarning = (token) => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    const decoded = parseJwt(token);
    if (!decoded?.exp) return;
    const expiresAt = decoded.exp * 1000;
    const warnAt = expiresAt - 5 * 60 * 1000; // 5 min before expiry
    const now = Date.now();
    const delay = Math.max(warnAt - now, 0);
    expiryTimerRef.current = setTimeout(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearSession();
        setAuthRedirect('/login?reason=expired');
      }
    }, delay);
  };

  // ---- Check existing session on mount ----
  const checkSession = useCallback(async () => {
    setIsLoading(true);
    const token = getToken();
    const storedUser = localStorage.getItem(USER_KEY);

    if (!token) {
      clearSession();
      setIsLoading(false);
      return;
    }

    // Quick check: is token expired?
    const decoded = parseJwt(token);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      clearSession();
      setIsLoading(false);
      return;
    }

    // Restore from localStorage immediately for fast render
    if (storedUser) {
      try {
        const profile = JSON.parse(storedUser);
        setUser({ userId: profile.userId || profile.email, username: profile.email });
        setUserProfile(profile);
      } catch { /* ignore */ }
    }

    // Validate with backend
    try {
      const response = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = response.data?.profile;
      if (profile) {
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        setUserProfile(profile);
        scheduleExpiryWarning(token);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearSession();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // ---- Login ----
  const login = async (email, password) => {
    clearError();
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, profile } = response.data;
      setSession(token, profile);
      return profile?.role || 'user';
    } catch (err) {
      const status = err.response?.status;
      let message = 'Something went wrong. Please try again.';
      if (status === 401) message = 'Invalid email or password.';
      if (status === 429) message = 'Too many attempts. Please wait and try again.';
      if (status === 400) message = err.response?.data?.error || 'Invalid request.';
      if (!err.response) message = 'Network error. Please check your connection.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Register ----
  const register = async (formData) => {
    clearError();
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', formData);
      const { token, profile } = response.data;
      setSession(token, profile);
      return profile;
    } catch (err) {
      const status = err.response?.status;
      let message = 'Something went wrong. Please try again.';
      if (status === 409) message = 'An account with this email already exists.';
      if (status === 400) {
        const details = err.response?.data?.details;
        if (Array.isArray(details)) {
          message = details.map(d => d.message).join('. ');
        } else {
          message = err.response?.data?.error || 'Validation failed.';
        }
      }
      if (!err.response) message = 'Network error. Please check your connection.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Logout ----
  const logout = useCallback(() => {
    clearSession();
  }, []);

  // ---- Update profile (local) ----
  const updateProfile = (updates) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        error,
        clearError,
        updateProfile,
        getToken,
        authRedirect,
        clearAuthRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
