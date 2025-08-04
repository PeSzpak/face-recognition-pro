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
}

export interface PersonCreateRequest {
  name: string;
  description?: string;
}

export interface PersonUpdateRequest {
  name?: string;
  description?: string;
}

export interface PersonListResponse {
  persons: Person[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface RecognitionResult {
  confidence: number;
  status: 'success' | 'no_match' | 'no_face' | 'error';
  processing_time: number;
  person_id?: string;
  person_name?: string;
  message?: string;
}

export interface RecognitionRequest {
  image_base64: string;
  threshold?: number;
}

export interface RecognitionLog {
  id: string;
  timestamp: string;
  status: string;
  person_name?: string;
  confidence?: number;
  processing_time: number;
}

export interface RecognitionStats {
  total_recognitions: number;
  successful_recognitions: number;
  accuracy: number;
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