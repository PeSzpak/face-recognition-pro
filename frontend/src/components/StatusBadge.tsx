import { STATUS_LABEL } from '@/lib/format'
import type { EventStatus } from '@/lib/types'
import { Badge, type Tone } from './ui/Badge'

const TONE: Record<EventStatus, Tone> = {
  identified: 'ok',
  unknown: 'warn',
  no_face: 'neutral',
  denied: 'bad',
}

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
