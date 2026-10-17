import clsx from 'clsx'
import type { ReactNode } from 'react'

const TONES = {
  ok: 'bg-ok/10 text-ok ring-ok/25',
  warn: 'bg-warn/10 text-warn ring-warn/25',
  bad: 'bg-bad/10 text-bad ring-bad/25',
  accent: 'bg-accent/10 text-accent ring-accent/25',
  neutral: 'bg-raised text-muted ring-line',
}

export type Tone = keyof typeof TONES

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset', TONES[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
