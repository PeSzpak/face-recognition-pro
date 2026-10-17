import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/api'
import { formatDateTime, formatRelative, SOURCE_LABEL, STATUS_LABEL } from '@/lib/format'
import type { EventSource, EventStatus } from '@/lib/types'

const PAGE_SIZE = 25

function Select<T extends string>({ value, onChange, options, label }: { value: T | ''; onChange: (v: T | '') => void; options: Record<T, string>; label: string }) {
  return (
    <select className="field w-auto pr-8" value={value} onChange={(e) => onChange(e.target.value as T | '')} aria-label={label}>
      <option value="">{label}</option>
      {(Object.entries(options) as [T, string][]).map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  )
}

export function HistoryPage() {
  const [status, setStatus] = useState<EventStatus | ''>('')
  const [source, setSource] = useState<EventSource | ''>('')
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [status, source])

  const { data, isLoading } = useQuery({
    queryKey: ['events', { status, source, page }],
    queryFn: () => api.events({ status: status || undefined, source: source || undefined, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Registro auditável de cada reconhecimento e tentativa de login por Face ID."
        actions={
          <>
            <Select value={status} onChange={setStatus} options={STATUS_LABEL} label="Todos os status" />
            <Select value={source} onChange={setSource} options={SOURCE_LABEL} label="Todas as origens" />
          </>
        }
      />

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={<History className="h-5 w-5" />} title="Nada por aqui" description="Os eventos aparecem quando alguém usa o reconhecimento ou o login por Face ID." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Quando', 'Pessoa', 'Status', 'Origem', 'Similaridade', 'Tempo'].map((h) => (
                    <th key={h} className="label px-5 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((event) => (
                  <tr key={event.id} className="hover:bg-raised/40">
                    <td className="whitespace-nowrap px-5 py-3">
                      <div>{formatRelative(event.created_at)}</div>
                      <div className="text-[12px] text-faint">{formatDateTime(event.created_at)}</div>
                    </td>
                    <td className="px-5 py-3">
                      {event.person_id && event.person_name ? (
                        <Link to={`/people/${event.person_id}`} className="font-medium hover:text-accent">
                          {event.person_name}
                        </Link>
                      ) : (
                        <span className="text-faint">{event.status === 'no_face' ? 'Nenhum rosto' : 'Não identificado'}</span>
                      )}
                      {event.faces_count > 1 && <span className="ml-2 text-[12px] text-faint">({event.faces_count} rostos)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-5 py-3 text-muted">{SOURCE_LABEL[event.source]}</td>
                    <td className="w-48 px-5 py-3">{event.confidence !== null ? <ConfidenceMeter value={event.confidence} compact /> : <span className="text-faint">—</span>}</td>
                    <td className="tabular whitespace-nowrap px-5 py-3 font-mono text-[12px] text-muted">{event.processing_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <div className="border-t border-line px-5 py-3">
            <Pagination page={page} size={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        )}
      </div>
    </>
  )
}
