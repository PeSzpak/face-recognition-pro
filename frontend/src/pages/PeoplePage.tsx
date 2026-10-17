import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageOff, Search, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Segmented } from '@/components/ui/Segmented'
import { Skeleton } from '@/components/ui/Skeleton'
import { PersonFormModal } from '@/features/PersonFormModal'
import { api } from '@/lib/api'
import { formatRelative } from '@/lib/format'
import type { Person } from '@/lib/types'

const PAGE_SIZE = 24

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function PersonCard({ person }: { person: Person }) {
  const subtitle = [person.position, person.department].filter(Boolean).join(' · ')
  return (
    <Link to={`/people/${person.id}`} className="panel group flex flex-col p-4 transition-colors hover:border-faint">
      <div className="flex items-start gap-3">
        <PersonAvatar person={person} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="truncate font-semibold group-hover:text-accent">{person.name}</div>
          <div className="truncate text-[12px] text-muted">{subtitle || person.email || 'Sem detalhes'}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px]">
        {person.sample_count === 0 ? (
          <Badge tone="warn">
            <ImageOff className="h-3 w-3" /> Sem fotos
          </Badge>
        ) : (
          <span className="text-muted">
            {person.sample_count} {person.sample_count === 1 ? 'foto' : 'fotos'}
          </span>
        )}
        {!person.active ? (
          <Badge>Inativo</Badge>
        ) : (
          <span className="text-faint">{person.last_seen_at ? `Visto ${formatRelative(person.last_seen_at)}` : 'Nunca visto'}</span>
        )}
      </div>
    </Link>
  )
}

export function PeoplePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const term = useDebounced(search)

  useEffect(() => setPage(1), [term, status])

  const { data, isLoading } = useQuery({
    queryKey: ['persons', { term, status, page }],
    queryFn: () => api.persons({ search: term, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const filtered = term !== '' || status !== 'all'

  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Cadastro com fotos de referência usadas no reconhecimento."
        actions={
          <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Nova pessoa
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input className="field pl-9" placeholder="Buscar por nome, e-mail, depto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'active', label: 'Ativas' },
            { value: 'inactive', label: 'Inativas' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[136px] rounded-xl" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
          <div className="mt-6">
            <Pagination page={page} size={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        </>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={filtered ? 'Nenhum resultado' : 'Nenhuma pessoa cadastrada'}
            description={filtered ? 'Tente outro termo ou remova os filtros.' : 'Cadastre alguém e envie algumas fotos para começar a reconhecer.'}
            action={
              !filtered && (
                <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Nova pessoa
                </Button>
              )
            }
          />
        </div>
      )}

      <PersonFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (fields) => {
          const person = await api.createPerson(fields)
          queryClient.invalidateQueries({ queryKey: ['persons'] })
          navigate(`/people/${person.id}?addPhotos=1`)
        }}
      />
    </>
  )
}
