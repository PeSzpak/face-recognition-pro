// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'face_recognition_access_token',
  REFRESH_TOKEN: 'face_recognition_refresh_token',
  USER_DATA: 'face_recognition_user_data',
  THEME: 'face_recognition_theme',
  LANGUAGE: 'face_recognition_language',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    PASSWORD_RESET: '/auth/password-reset',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm',
    SESSIONS: '/auth/sessions',
  },
  
  // Token refresh (legacy support)
  REFRESH: '/auth/refresh',
  
  // Persons endpoints
  PERSONS: {
    LIST: '/persons',
    CREATE: '/persons',
    DETAIL: (id: string) => `/persons/${id}`,
    UPDATE: (id: string) => `/persons/${id}`,
    DELETE: (id: string) => `/persons/${id}`,
    PHOTOS: (id: string) => `/persons/${id}/photos`,
    SEARCH: '/persons/search',
    STATS: (id: string) => `/persons/${id}/stats`,
  },
  
  // Recognition endpoints
  RECOGNITION: {
    UPLOAD: '/recognition/upload',
    WEBCAM: '/recognition/webcam',
    BATCH: '/recognition/batch',
    HISTORY: '/recognition/history',
  },
  
  // Recognition legacy endpoints
  RECOGNITION_IDENTIFY: '/recognition/identify',
  RECOGNITION_LOGS: '/recognition/logs',
  RECOGNITION_STATS: '/recognition/stats',
  
  // Dashboard endpoints
  DASHBOARD: {
    STATS: '/dashboard/stats',
    ACTIVITY: '/dashboard/activity',
  },
  
  // Analytics endpoints
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    PERSONS: '/analytics/persons',
    RECOGNITION: '/analytics/recognition',
    EXPORT: '/analytics/export',
  },
} as const

// App Configuration
export const APP_CONFIG = {
  NAME: 'Face Recognition Pro',
  VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'pt-BR',
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
} as const

// API Configuration (alias para APP_CONFIG para compatibilidade)
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
}

// Recognition Configuration
export const RECOGNITION_CONFIG = {
  MIN_CONFIDENCE: 0.6,
  MAX_FACES_PER_IMAGE: 10,
  IMAGE_QUALITY_THRESHOLD: 0.7,
  WEBCAM_CAPTURE_INTERVAL: 2000, // 2 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  WEBCAM_WIDTH: 640,
  WEBCAM_HEIGHT: 480,
  SUPPORTED_FORMATS: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ] as string[], // Make more flexible
} as const

// UI Configuration
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 256,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  PAGINATION_PAGE_SIZE: 20,
  TOAST_DURATION: 4000,
} as const

// Chart Colors for Analytics
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gradient: {
    blue: ['#3b82f6', '#1d4ed8'],
    purple: ['#8b5cf6', '#5b21b6'],
    green: ['#10b981', '#047857'],
    orange: ['#f59e0b', '#d97706'],
    red: ['#ef4444', '#dc2626'],
  },
  chart: [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
  ]
} as const

// Messages for UI
export const MESSAGES = {
  ERROR: {
    NETWORK: 'Erro de conexão. Verifique sua internet.',
    UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    FORBIDDEN: 'Você não tem permissão para esta ação.',
    NOT_FOUND: 'Recurso não encontrado.',
    SERVER_ERROR: 'Erro interno do servidor. Tente novamente.',
    VALIDATION: 'Dados inválidos. Verifique os campos.',
    UPLOAD: 'Erro ao fazer upload do arquivo.',
    RECOGNITION: 'Erro no reconhecimento facial.',
  },
  SUCCESS: {
    LOGIN: 'Login realizado com sucesso!',
    LOGOUT: 'Logout realizado com sucesso!',
    SAVE: 'Dados salvos com sucesso!',
    DELETE: 'Item removido com sucesso!',
    UPDATE: 'Dados atualizados com sucesso!',
    UPLOAD: 'Upload realizado com sucesso!',
    RECOGNITION: 'Reconhecimento realizado com sucesso!',
  },
  LOADING: {
    DEFAULT: 'Carregando...',
    LOGIN: 'Entrando...',
    SAVING: 'Salvando...',
    UPLOADING: 'Fazendo upload...',
    PROCESSING: 'Processando...',
    RECOGNIZING: 'Reconhecendo faces...',
  }
} as const

// File upload constraints
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  ACCEPTED_FORMATS: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ],
  MIN_IMAGE_SIZE: {
    width: 100,
    height: 100
  },
  MAX_IMAGE_SIZE: {
    width: 4096,
    height: 4096
  }
} as const

// Validation rules
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SYMBOLS: false
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PERSON_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  }
} as const