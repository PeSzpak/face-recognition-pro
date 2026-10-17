export type EventSource = 'upload' | 'camera' | 'face_login'
export type EventStatus = 'identified' | 'unknown' | 'no_face' | 'denied'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  person_id: string | null
  created_at: string
}

export interface Session {
  access_token: string
  user: User
  confidence: number | null
}

export interface PersonFields {
  name: string
  email: string | null
  department: string | null
  position: string | null
  external_id: string | null
  notes: string | null
}

export interface Person extends PersonFields {
  id: string
  active: boolean
  sample_count: number
  cover_sample_id: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface Sample {
  id: string
  quality: number
  width: number
  height: number
  created_at: string
}

export interface SampleUploadResult {
  added: Sample[]
  rejected: { file_name: string; reason: string }[]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Candidate {
  person_id: string
  name: string
  cover_sample_id: string | null
  similarity: number
}

export interface FaceResult {
  box: Box
  quality: number
  status: 'identified' | 'unknown'
  person: Candidate | null
  candidates: Candidate[]
}

export interface IdentifyResponse {
  image_width: number
  image_height: number
  faces: FaceResult[]
  processing_ms: number
  threshold: number
}

export interface RecognitionEvent {
  id: string
  source: EventSource
  status: EventStatus
  person_id: string | null
  person_name: string | null
  confidence: number | null
  faces_count: number
  processing_ms: number
  created_at: string
}

export interface Overview {
  persons_total: number
  persons_active: number
  samples_total: number
  events_total: number
  events_today: number
  identification_rate: number
  avg_confidence: number
  avg_processing_ms: number
  daily: { day: string; identified: number; unknown: number; no_face: number }[]
  hourly: number[]
  top_persons: { person_id: string; name: string; cover_sample_id: string | null; count: number }[]
}

export interface SystemInfo {
  model: string
  detector: string
  embedding_size: number
  match_threshold: number
  face_login_threshold: number
  models_ready: boolean
  database: boolean
  vector_store: boolean
  vectors: number
}
