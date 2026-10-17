import type { ReactNode } from 'react'

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-line bg-raised text-muted">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
