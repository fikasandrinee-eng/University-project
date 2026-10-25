import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

const normalizeUser = (u) => {
  if (!u) return null;
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return {
    ...u,
    name: u.name || fullName || u.email,
  };
};

const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem('ums_user') || localStorage.getItem('ums_user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(() => sessionStorage.getItem('ums_token') || localStorage.getItem('ums_token'));

  // Decode JWT payload (no signature verification on client)
  const decodeToken = (tkn) => {
    try {
      const payload = tkn.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return null;
    }
  };

  const setAuth = useCallback((newToken, userData, remember = true) => {
    if (newToken && userData) {
      const normalized = normalizeUser(userData);
      sessionStorage.setItem('ums_token', newToken);
      sessionStorage.setItem('ums_user', JSON.stringify(normalized));
      if (remember) {
        localStorage.setItem('ums_token', newToken);
        localStorage.setItem('ums_user', JSON.stringify(normalized));
      } else {
        localStorage.removeItem('ums_token');
        localStorage.removeItem('ums_user');
      }
      setToken(newToken);
      setUser(normalized);
    }
  }, []);

  // Load user from stored token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('ums_token') || localStorage.getItem('ums_token');
      if (storedToken) {
        const decoded = decodeToken(storedToken);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          try {
            const res = await authService.getProfile();
            const userData = normalizeUser(res.data || res);
            setUser(userData);
            setToken(storedToken);
            sessionStorage.setItem('ums_token', storedToken);
            sessionStorage.setItem('ums_user', JSON.stringify(userData));
          } catch (err) {
            // Only clear session if token is explicitly rejected (401)
            if (err?.response?.status === 401 || err?.status === 401) {
              sessionStorage.removeItem('ums_token');
              sessionStorage.removeItem('ums_user');
              localStorage.removeItem('ums_token');
              localStorage.removeItem('ums_user');
              setToken(null);
              setUser(null);
            }
          }
        } else {
          sessionStorage.removeItem('ums_token');
          sessionStorage.removeItem('ums_user');
          localStorage.removeItem('ums_token');
          localStorage.removeItem('ums_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    const response = await authService.login(email, password);
    const payload = response.data || response;
    const { token: newToken, user: userData } = payload;
    setAuth(newToken, userData, remember);
    return normalizeUser(userData);
  }, [setAuth]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('ums_token');
    sessionStorage.removeItem('ums_user');
    localStorage.removeItem('ums_token');
    localStorage.removeItem('ums_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        setAuth,
        setUser: (u) => setUser(normalizeUser(u)),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
