import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, Hash, ImagePlus, Mail, Pencil, Power, Trash2, Briefcase } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PersonAvatar, SampleImage } from '@/components/PersonAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { PersonFormModal } from '@/features/PersonFormModal'
import { SampleCaptureModal } from '@/features/SampleCaptureModal'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime, formatRelative, percent, SOURCE_LABEL } from '@/lib/format'
import type { Person } from '@/lib/types'

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-faint">{icon}</span>
      <div className="min-w-0">
        <div className="text-[12px] text-faint">{label}</div>
        <div className="truncate">{value || <span className="text-faint">—</span>}</div>
      </div>
    </div>
  )
}

function Samples({ person, onAdd }: { person: Person; onAdd: () => void }) {
  const queryClient = useQueryClient()
  const { data: samples } = useQuery({ queryKey: ['samples', person.id], queryFn: () => api.samples(person.id) })
  const remove = useMutation({
    mutationFn: (sampleId: string) => api.deleteSample(person.id, sampleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples', person.id] })
      queryClient.invalidateQueries({ queryKey: ['person', person.id] })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Fotos de referência</h2>
          <p className="mt-0.5 text-[12px] text-muted">Cada foto vira um vetor de 512 dimensões. 3 a 5 ângulos dão o melhor resultado.</p>
        </div>
        <Button icon={<ImagePlus className="h-4 w-4" />} onClick={onAdd}>
          Adicionar
        </Button>
      </div>
      {!samples ? (
        <Skeleton className="h-32" />
      ) : samples.length === 0 ? (
        <button
          onClick={onAdd}
          className="grid h-40 w-full place-items-center rounded-xl border border-dashed border-warn/40 bg-warn/5 text-center text-[13px] text-warn transition-colors hover:bg-warn/10"
        >
          <span>
            <ImagePlus className="mx-auto mb-2 h-5 w-5" />
            Sem fotos, esta pessoa ainda não pode ser reconhecida.
            <br />
            <span className="text-muted">Clique para adicionar.</span>
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {samples.map((sample) => (
            <figure key={sample.id} className="group relative overflow-hidden rounded-lg ring-1 ring-line">
              <SampleImage personId={person.id} sampleId={sample.id} alt={`Foto de ${person.name}`} className="aspect-square w-full" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-[11px]">
                <span className="font-mono text-ink/80" title="Qualidade da foto">
                  Q {percent(sample.quality)}
                </span>
                <button
                  onClick={() => remove.mutate(sample.id)}
                  className="rounded p-1 text-ink/70 opacity-0 transition-opacity hover:bg-bad/30 hover:text-bad group-hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

function PersonEvents({ personId }: { personId: string }) {
  const { data } = useQuery({ queryKey: ['events', { personId }], queryFn: () => api.events({ person_id: personId, size: 8 }) })
  return (
    <section className="panel p-5">
      <h2 className="mb-3 font-semibold">Últimos reconhecimentos</h2>
      {!data ? (
        <Skeleton className="h-24" />
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">Ainda não foi reconhecida.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((event) => (
            <li key={event.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[1fr_160px_auto]">
              <div>
                <div className="text-[13px]">{SOURCE_LABEL[event.source]}</div>
                <div className="text-[12px] text-faint" title={formatDateTime(event.created_at)}>
                  {formatRelative(event.created_at)}
                </div>
              </div>
              <div className="hidden sm:block">{event.confidence !== null && <ConfidenceMeter value={event.confidence} compact />}</div>
              <StatusBadge status={event.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PersonPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const addingPhotos = params.get('addPhotos') === '1'
  const setAddingPhotos = (open: boolean) => setParams(open ? { addPhotos: '1' } : {}, { replace: true })

  const { data: person, isError } = useQuery({ queryKey: ['person', id], queryFn: () => api.person(id) })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['person', id] })
    queryClient.invalidateQueries({ queryKey: ['persons'] })
    queryClient.invalidateQueries({ queryKey: ['samples', id] })
  }

  const toggleActive = useMutation({
    mutationFn: () => api.updatePerson(id, { active: !person!.active }),
    onSuccess: (updated) => {
      refresh()
      toast.success(updated.active ? 'Pessoa reativada' : 'Pessoa desativada')
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      toast.success('Pessoa excluída')
      navigate('/people')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="font-medium">Pessoa não encontrada</p>
        <Link to="/people" className="mt-2 inline-block text-accent">
          Voltar para Pessoas
        </Link>
      </div>
    )
  }

  if (!person) return <Skeleton className="h-64 rounded-xl" />

  return (
    <>
      <Link to="/people" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Pessoas
      </Link>

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <PersonAvatar person={person} size="xl" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight">{person.name}</h1>
            {person.active ? <Badge tone="ok" dot>Ativa</Badge> : <Badge>Inativa</Badge>}
          </div>
          <p className="mt-1 text-muted">
            {person.last_seen_at ? `Reconhecida ${formatRelative(person.last_seen_at)}` : 'Nunca reconhecida'} · cadastrada em{' '}
            {formatDateTime(person.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button icon={<Power className="h-4 w-4" />} onClick={() => toggleActive.mutate()} loading={toggleActive.isPending}>
            {person.active ? 'Desativar' : 'Reativar'}
          </Button>
          <Button variant="danger" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="panel h-fit divide-y divide-line px-5 py-2">
          <Detail icon={<Mail className="h-4 w-4" />} label="E-mail" value={person.email} />
          <Detail icon={<Hash className="h-4 w-4" />} label="Matrícula" value={person.external_id} />
          <Detail icon={<Building2 className="h-4 w-4" />} label="Departamento" value={person.department} />
          <Detail icon={<Briefcase className="h-4 w-4" />} label="Cargo" value={person.position} />
          {person.notes && <p className="whitespace-pre-line py-3 text-[13px] text-muted">{person.notes}</p>}
        </aside>
        <div className="space-y-4">
          <Samples person={person} onAdd={() => setAddingPhotos(true)} />
          <PersonEvents personId={person.id} />
        </div>
      </div>

      <PersonFormModal
        open={editing}
        onClose={() => setEditing(false)}
        person={person}
        onSubmit={async (fields) => {
          await api.updatePerson(id, fields)
          refresh()
          toast.success('Dados atualizados')
        }}
      />

      <SampleCaptureModal
        open={addingPhotos}
        onClose={() => setAddingPhotos(false)}
        title={`Fotos de ${person.name}`}
        description="Cada imagem deve ter apenas o rosto desta pessoa."
        submitLabel="Enviar fotos"
        onSubmit={(images) => api.addSamples(id, images)}
        onDone={refresh}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir pessoa?"
        description="Remove o cadastro, as fotos e os vetores. O histórico de eventos fica, sem o nome."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">
          <span className="font-medium text-ink">{person.name}</span> deixará de ser reconhecida imediatamente.
        </p>
      </Modal>
    </>
  )
}
