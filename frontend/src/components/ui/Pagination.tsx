import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (total === 0) return null
  const first = (page - 1) * size + 1
  const last = Math.min(page * size, total)
  return (
    <div className="flex items-center justify-between gap-4 text-[13px] text-muted">
      <span className="tabular">
        {first}–{last} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <Button size="icon" variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Próxima página">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
