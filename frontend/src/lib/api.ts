import axios, { AxiosError } from 'axios'
import type {
  EventSource,
  EventStatus,
  IdentifyResponse,
  Overview,
  Page,
  Person,
  PersonFields,
  RecognitionEvent,
  Sample,
  SampleUploadResult,
  Session,
  SystemInfo,
  User,
} from './types'

const SESSION_KEY = 'frp.session'

export const sessionStore = {
  read(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as Session) : null
    } catch {
      return null
    }
  },
  write(session: Session | null) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  },
}

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

http.interceptors.request.use((config) => {
  const token = sessionStore.read()?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized: () => void = () => {}
export function handleUnauthorized(callback: () => void) {
  onUnauthorized = callback
}

http.interceptors.response.use(undefined, (error: AxiosError) => {
  const isLoginCall = error.config?.url?.includes('login')
  if (error.response?.status === 401 && !isLoginCall) onUnauthorized()
  return Promise.reject(error)
})

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AxiosError) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
    if (!error.response) return 'Sem conexão com o servidor'
  }
  return fallback
}

export function errorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError) return (error.response?.data as { code?: string } | undefined)?.code
}

function imageForm(field: string, files: Blob[], extra: Record<string, string> = {}) {
  const form = new FormData()
  files.forEach((file, i) => form.append(field, file, file instanceof File ? file.name : `captura-${i + 1}.jpg`))
  Object.entries(extra).forEach(([key, value]) => form.append(key, value))
  return form
}

const data = <T>(promise: Promise<{ data: T }>) => promise.then((r) => r.data)

export const api = {
  login: (username: string, password: string) => data<Session>(http.post('/api/auth/login', { username, password })),
  faceLogin: (image: Blob) => data<Session>(http.post('/api/auth/face-login', imageForm('image', [image]))),
  me: () => data<User>(http.get('/api/auth/me')),
  changePassword: (current_password: string, new_password: string) =>
    http.post('/api/auth/password', { current_password, new_password }),
  enrollFaceId: (images: Blob[]) => data<SampleUploadResult>(http.post('/api/auth/face-id', imageForm('images', images))),
  unlinkFaceId: () => http.delete('/api/auth/face-id'),

  persons: (params: { search?: string; status?: string; page?: number; size?: number }) =>
    data<Page<Person>>(http.get('/api/persons', { params })),
  person: (id: string) => data<Person>(http.get(`/api/persons/${id}`)),
  createPerson: (body: PersonFields) => data<Person>(http.post('/api/persons', body)),
  updatePerson: (id: string, body: Partial<PersonFields> & { active?: boolean }) =>
    data<Person>(http.patch(`/api/persons/${id}`, body)),
  deletePerson: (id: string) => http.delete(`/api/persons/${id}`),
  setFaceAccess: (id: string, enabled: boolean) =>
    data<Person>(enabled ? http.put(`/api/persons/${id}/face-access`) : http.delete(`/api/persons/${id}/face-access`)),

  samples: (personId: string) => data<Sample[]>(http.get(`/api/persons/${personId}/samples`)),
  addSamples: (personId: string, images: Blob[]) =>
    data<SampleUploadResult>(http.post(`/api/persons/${personId}/samples`, imageForm('images', images))),
  deleteSample: (personId: string, sampleId: string) => http.delete(`/api/persons/${personId}/samples/${sampleId}`),
  sampleImage: (personId: string, sampleId: string) =>
    data<Blob>(http.get(`/api/persons/${personId}/samples/${sampleId}/image`, { responseType: 'blob' })),

  identify: (image: Blob, source: EventSource, record = true) =>
    data<IdentifyResponse>(
      http.post('/api/recognition/identify', imageForm('image', [image], { source, record: String(record) })),
    ),
  events: (params: { status?: EventStatus; source?: EventSource; person_id?: string; page?: number; size?: number }) =>
    data<Page<RecognitionEvent>>(http.get('/api/recognition/events', { params })),

  overview: (days: number) =>
    data<Overview>(
      http.get('/api/stats/overview', { params: { days, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }),
    ),
  system: () => data<SystemInfo>(http.get('/api/stats/system')),
}
