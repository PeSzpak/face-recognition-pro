import type { EventSource, EventStatus } from './types'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

export function formatRelative(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'agora'
}

export const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

export const STATUS_LABEL: Record<EventStatus, string> = {
  identified: 'Identificado',
  unknown: 'Desconhecido',
  no_face: 'Sem rosto',
  denied: 'Negado',
}

export const SOURCE_LABEL: Record<EventSource, string> = {
  upload: 'Upload',
  camera: 'Câmera',
  face_login: 'Login Face ID',
}
