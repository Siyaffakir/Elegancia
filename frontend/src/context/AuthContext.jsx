// context/AuthContext.jsx — Admin Authentication state & JWT session management
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminLogin, adminMe, adminChangePassword, TOKEN_STORAGE_KEY } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Clear any legacy localStorage token to ensure login page is always required on new sessions
  useEffect(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {}
  }, []);

  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount or token change
  const verifySession = useCallback(async () => {
    let savedToken = null;
    try {
      savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (e) {}

    if (!savedToken) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await adminMe();
      if (data && data.user) {
        setUser(data.user);
        setToken(savedToken);
      } else {
        throw new Error('Invalid user payload');
      }
    } catch (err) {
      console.warn('[Auth] Session validation failed or expired.');
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (e) {}
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();

    // Listen for unauthorized events emitted by API interceptor
    function handleUnauthorized() {
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (e) {}
      setToken(null);
      setUser(null);
    }

    window.addEventListener('dz:auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dz:auth:unauthorized', handleUnauthorized);
  }, [verifySession]);

  const login = async (username, password) => {
    const res = await adminLogin(username, password);
    if (res && res.token) {
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      } catch (e) {}
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('No token returned by login service');
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {}
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    return await adminChangePassword(currentPassword, newPassword);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
    changePassword,
    verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
