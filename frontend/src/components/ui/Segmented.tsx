import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Option<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
            value === option.value ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
