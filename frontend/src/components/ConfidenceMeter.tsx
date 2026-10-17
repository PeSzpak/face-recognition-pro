import clsx from 'clsx'
import { percent } from '@/lib/format'

export function ConfidenceMeter({ value, threshold, compact }: { value: number; threshold?: number; compact?: boolean }) {
  const passes = threshold === undefined || value >= threshold
  return (
    <div className="flex items-center gap-2.5">
      <div className={clsx('relative h-1.5 flex-1 overflow-hidden rounded-full bg-raised', compact ? 'min-w-[48px]' : 'min-w-[80px]')}>
        <div
          className={clsx('absolute inset-y-0 left-0 rounded-full transition-all', passes ? 'bg-ok' : 'bg-warn')}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
        {threshold !== undefined && (
          <div className="absolute inset-y-0 w-px bg-ink/60" style={{ left: `${threshold * 100}%` }} title={`Limiar ${percent(threshold)}`} />
        )}
      </div>
      <span className="tabular w-11 text-right font-mono text-[12px] text-muted">{percent(value, 1)}</span>
    </div>
  )
}
