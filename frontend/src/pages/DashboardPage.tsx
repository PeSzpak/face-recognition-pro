import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Gauge, ScanFace, Timer, UserPlus, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/api'
import { formatRelative, percent, SOURCE_LABEL } from '@/lib/format'
import type { Overview } from '@/lib/types'

const SERIES = [
  { key: 'identified', label: 'Identificados', color: 'rgb(var(--ok))' },
  { key: 'unknown', label: 'Desconhecidos', color: 'rgb(var(--warn))' },
  { key: 'no_face', label: 'Sem rosto', color: 'rgb(var(--faint))' },
] as const

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between text-faint">
        <span className="label">{label}</span>
        {icon}
      </div>
      <div className="tabular mt-3 text-[22px] font-semibold tracking-tight sm:text-[28px]">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

function ActivityChart({ daily }: { daily: Overview['daily'] }) {
  const data = daily.map((d) => ({ ...d, label: d.day.slice(8, 10) + '/' + d.day.slice(5, 7) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: 'rgb(var(--raised))' }}
          contentStyle={{ background: 'rgb(var(--raised))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'rgb(var(--ink))', marginBottom: 4 }}
        />
        {SERIES.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function HourlyStrip({ hourly }: { hourly: number[] }) {
  const max = Math.max(1, ...hourly)
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {hourly.map((count, hour) => (
          <div
            key={hour}
            title={`${hour}h · ${count} eventos`}
            className="h-8 rounded-sm bg-accent"
            style={{ opacity: count ? 0.15 + (count / max) * 0.85 : 0.06 }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}

function RecentEvents() {
  const { data } = useQuery({ queryKey: ['events', 'recent'], queryFn: () => api.events({ size: 6 }) })
  if (!data) return <Skeleton className="h-48" />
  if (!data.items.length) return <p className="py-10 text-center text-[13px] text-muted">Nenhum reconhecimento registrado ainda.</p>
  return (
    <ul className="divide-y divide-line">
      {data.items.map((event) => (
        <li key={event.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{event.person_name ?? (event.status === 'no_face' ? 'Nenhum rosto' : 'Pessoa não cadastrada')}</div>
            <div className="text-[12px] text-faint">
              {SOURCE_LABEL[event.source]} · {formatRelative(event.created_at)}
            </div>
          </div>
          <StatusBadge status={event.status} />
        </li>
      ))}
    </ul>
  )
}

export function DashboardPage() {
  const [days, setDays] = useState<'7' | '14' | '30'>('14')
  const { data, isLoading } = useQuery({ queryKey: ['overview', days], queryFn: () => api.overview(Number(days)) })

  const actions = (
    <>
      <Link to="/people">
        <Button icon={<UserPlus className="h-4 w-4" />}>Cadastrar pessoa</Button>
      </Link>
      <Link to="/recognize">
        <Button variant="primary" icon={<ScanFace className="h-4 w-4" />}>
          Reconhecer
        </Button>
      </Link>
    </>
  )

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Visão geral" description="Atividade de reconhecimento e saúde do sistema." actions={actions} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[118px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 rounded-xl" />
      </>
    )
  }

  if (data.persons_total === 0) {
    return (
      <>
        <PageHeader title="Visão geral" description="Atividade de reconhecimento e saúde do sistema." />
        <div className="panel">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Comece cadastrando uma pessoa"
            description="Envie de 3 a 5 fotos de ângulos diferentes. Depois é só apontar a câmera ou enviar uma imagem para reconhecer."
            action={
              <Link to="/people">
                <Button variant="primary" icon={<UserPlus className="h-4 w-4" />}>
                  Cadastrar primeira pessoa
                </Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Visão geral" description="Atividade de reconhecimento e saúde do sistema." actions={actions} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Pessoas" value={data.persons_active} hint={`${data.samples_total} fotos de referência`} />
        <Kpi icon={<ScanFace className="h-4 w-4" />} label="Hoje" value={data.events_today} hint={`${data.events_total} eventos no total`} />
        <Kpi
          icon={<Gauge className="h-4 w-4" />}
          label="Taxa de identificação"
          value={percent(data.identification_rate)}
          hint={data.avg_confidence ? `Similaridade média ${percent(data.avg_confidence, 1)}` : 'Rostos detectados que foram reconhecidos'}
        />
        <Kpi icon={<Timer className="h-4 w-4" />} label="Latência média" value={`${Math.round(data.avg_processing_ms)} ms`} hint="Detecção + embedding + busca" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Reconhecimentos por dia</h2>
              <div className="mt-1 flex gap-4 text-[12px] text-muted">
                {SERIES.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { value: '7', label: '7d' },
                { value: '14', label: '14d' },
                { value: '30', label: '30d' },
              ]}
            />
          </div>
          <ActivityChart daily={data.daily} />
        </section>

        <section className="panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Atividade recente</h2>
            <Link to="/history" className="flex items-center gap-1 text-[12px] text-muted hover:text-ink">
              Ver tudo <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <RecentEvents />
        </section>

        <section className="panel p-5 xl:col-span-2">
          <h2 className="font-semibold">Horários de pico</h2>
          <p className="mb-5 mt-1 text-[12px] text-muted">Eventos por hora do dia nos últimos {days} dias</p>
          <HourlyStrip hourly={data.hourly} />
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 font-semibold">Mais reconhecidos</h2>
          {data.top_persons.length ? (
            <ol className="space-y-3">
              {data.top_persons.map((person, index) => (
                <li key={person.person_id}>
                  <Link to={`/people/${person.person_id}`} className="flex items-center gap-3 rounded-lg hover:bg-raised/50">
                    <span className="w-4 font-mono text-[12px] text-faint">{index + 1}</span>
                    <PersonAvatar person={{ id: person.person_id, name: person.name, cover_sample_id: person.cover_sample_id }} size="sm" />
                    <span className="flex-1 truncate font-medium">{person.name}</span>
                    <span className="tabular font-mono text-[12px] text-muted">{person.count}×</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted">Ninguém identificado no período.</p>
          )}
        </section>
      </div>
    </>
  )
}
