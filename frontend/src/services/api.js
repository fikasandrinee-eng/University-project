import axios from 'axios';

// Resolve public backend base URL:
// 1. If VITE_API_URL is configured (e.g. in Vercel or .env), use it
// 2. In production builds, default to deployed Render backend: https://university-management-api-mefq.onrender.com/api
// 3. In development (Vite dev server), use relative /api to leverage the Vite proxy (http://localhost:5000)
export const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    return clean;
  }
  if (import.meta.env.PROD) {
    return 'https://university-management-api-mefq.onrender.com/api';
  }
  return '/api';
};

export const BASE_URL = getBaseUrl();

// Backend root origin (for static file uploads like /uploads/profiles/...)
export const getBackendOrigin = () => {
  const baseUrl = getBaseUrl();
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    try {
      const parsed = new URL(baseUrl);
      return parsed.origin;
    } catch {
      // Fallback below
    }
  }
  if (import.meta.env.PROD) {
    return 'https://university-management-api-mefq.onrender.com';
  }
  return 'http://localhost:5000';
};

// Helper to convert relative upload path to absolute asset URL
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const origin = getBackendOrigin();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('ums_token') || localStorage.getItem('ums_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401, normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('ums_token');
      sessionStorage.removeItem('ums_user');
      localStorage.removeItem('ums_token');
      localStorage.removeItem('ums_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register-admin') {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({ ...error, message });
  }
);

export default api;
