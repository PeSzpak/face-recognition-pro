export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Person {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  photo_count: number;
  created_at: string;
  updated_at: string;
  
  // New fields for Face ID authentication
  role?: string; // 'admin' | 'manager' | 'user' | 'guest'
  department?: string;
  position?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  can_use_face_auth?: boolean;
}

export interface PersonCreateRequest {
  name: string;
  description?: string;
  
  // New fields
  role?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  can_use_face_auth?: boolean;
}

export interface PersonUpdateRequest {
  name?: string;
  description?: string;
  active?: boolean;
  
  // New fields
  role?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  can_use_face_auth?: boolean;
}

export interface PersonListResponse {
  persons: Person[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

// Recognition Types 
export interface RecognitionRequest {
  image_base64?: string
  file?: File
  threshold?: number
}

export interface RecognitionResult {
  person_id?: string
  person_name?: string
  confidence?: number
  face_location?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  processing_time?: number
  recognized?: boolean
  status?: 'success' | 'error' | 'not_found' | 'no_match' | 'no_face'
  message?: string
}

export interface RecognitionHistory {
  id: string
  person_id?: string
  person_name?: string
  confidence?: number
  image_path: string
  recognized: boolean
  timestamp: string
  processing_time?: number
}

export interface RecognitionLog {
  id: string
  person_id?: string
  person_name?: string
  confidence?: number
  image_path: string
  status: 'success' | 'error' | 'not_found' | 'no_match' | 'no_face'
  timestamp: string
  processing_time?: number
  error_message?: string
}

export interface RecognitionStats {
  total_recognitions: number
  successful_recognitions: number
  failed_recognitions: number
  average_confidence: number
  total_processing_time: number
  average_processing_time: number
}

export interface DashboardStats {
  total_persons: number;
  active_persons: number;
  total_recognitions: number;
  recognitions_today: number;
  successful_recognitions: number;
  accuracy: number;
  vector_database: {
    total_vectors: number;
    dimension: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: string;
  person_name?: string;
  confidence?: number;
  details: string;
  timestamp: string;
}

export interface AnalyticsData {
  daily_recognitions: Array<{ date: string; count: number }>;
  success_rate_trend: Array<{ date: string; rate: number }>;
  top_recognized_persons: Array<{ name: string; count: number }>;
  performance_metrics: {
    avg_processing_time: number;
    peak_hour: string;
    total_embeddings: number;
  };
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export interface ImageUploadProps {
  onUpload: (file: File) => Promise<void>;
}

export interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
}

// Auth Types
export interface LoginRequest {
  username: string
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  full_name: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface TokenPayload {
  sub: string
  username: string
  exp: number
  iat: number
}

// Password Reset
export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  new_password: string
}

// Session Management
export interface SessionInfo {
  device: string
  ip_address: string
  user_agent: string
  created_at: string
  last_active: string
  is_current: boolean
}

// Face ID Types (para o novo sistema)
export interface FaceIDResult {
  recognized: boolean
  person_name?: string
  person_id?: string
  confidence?: number
  liveness_score?: number
  spoofing_detected?: boolean
  status: 'success' | 'no_match' | 'no_face' | 'error' | 'spoofing_detected'
  processing_time?: number
  message?: string
  motion_history?: number[]
  face_quality?: 'high' | 'medium' | 'low'
}

// Face ID Authentication
export interface FaceAuthRequest {
  image_base64: string
}

export interface FaceAuthResponse {
  access_token: string
  token_type: string
  auth_method: string
  user: User
  confidence: number
  processing_time: number
}

export interface FaceAuthLog {
  id: string
  person_id?: string
  person_name?: string
  person_role?: string
  confidence?: number
  status: 'success' | 'failed' | 'denied' | 'no_face' | 'no_match'
  ip_address?: string
  processing_time?: number
  error_message?: string
  created_at: string
}

export interface FaceAuthStats {
  total_attempts: number
  successful_attempts: number
  success_rate: number
  denied_attempts: number
  no_face_attempts: number
  no_match_attempts: number
  average_confidence: number
  average_processing_time: number
  unique_users: number
}

// Role Types
export type PersonRole = 'admin' | 'manager' | 'user' | 'guest'

export const PERSON_ROLES: { value: PersonRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'user', label: 'Usuário' },
  { value: 'guest', label: 'Visitante' }
]
