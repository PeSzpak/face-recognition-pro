export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
};

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',

  // Person endpoints
  PERSONS: '/persons',
  PERSON_BY_ID: (id: string) => `/persons/${id}`,
  PERSON_PHOTOS: (id: string) => `/persons/${id}/photos`,

  // Recognition endpoints
  RECOGNITION_IDENTIFY: '/recognition/identify',
  RECOGNITION_LOGS: '/recognition/logs',
  RECOGNITION_STATS: '/recognition/stats',

  // Dashboard endpoints
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_RECENT: '/dashboard/recent-activity',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',

  // Health endpoint
  HEALTH: '/health',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'face_recognition_token',
  USER_DATA: 'face_recognition_user',
};

export const RECOGNITION_CONFIG = {
  WEBCAM_WIDTH: 640,
  WEBCAM_HEIGHT: 480,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  DEFAULT_THRESHOLD: 0.6,
  MIN_THRESHOLD: 0.3,
  MAX_THRESHOLD: 0.9,
};

export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  GRADIENT: [
    '#3b82f6',
    '#8b5cf6',
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#ef4444',
  ],
};

export const MESSAGES = {
  ERROR_NETWORK: 'Network error. Please check your connection.',
  ERROR_GENERIC: 'An unexpected error occurred.',
};