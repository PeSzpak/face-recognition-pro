import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Cpu, Database, KeyRound, ScanFace, Server } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { SampleCaptureModal } from '@/features/SampleCaptureModal'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { percent } from '@/lib/format'

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="panel p-6">
      <div className="mb-5 flex gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-accent">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function FaceIdCard() {
  const { user, refreshUser } = useAuth()
  const [enrolling, setEnrolling] = useState(false)
  const unlink = useMutation({
    mutationFn: api.unlinkFaceId,
    onSuccess: async () => {
      await refreshUser()
      toast.success('Face ID desativado')
    },
  })
  const linked = !!user?.person_id

  return (
    <Card icon={<ScanFace className="h-4 w-4" />} title="Face ID" description="Entre no painel olhando para a câmera, sem digitar senha.">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
        <div className="flex items-center gap-3">
          {linked ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <ScanFace className="h-5 w-5 text-faint" />}
          <div>
            <div className="font-medium">{linked ? 'Ativo' : 'Não configurado'}</div>
            <div className="text-[12px] text-muted">
              {linked ? (
                <>
                  Vinculado ao cadastro{' '}
                  <Link to={`/people/${user!.person_id}`} className="text-accent hover:underline">
                    de pessoa
                  </Link>
                  . Adicione mais fotos para melhorar a precisão.
                </>
              ) : (
                'Capture 3 fotos do seu rosto para ativar.'
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {linked && user?.password_login && (
            <Button variant="ghost" onClick={() => unlink.mutate()} loading={unlink.isPending}>
              Desativar
            </Button>
          )}
          <Button variant={linked ? 'secondary' : 'primary'} onClick={() => setEnrolling(true)}>
            {linked ? 'Adicionar fotos' : 'Ativar Face ID'}
          </Button>
        </div>
      </div>
      <SampleCaptureModal
        open={enrolling}
        onClose={() => setEnrolling(false)}
        initialMode="camera"
        title="Configurar Face ID"
        description="Olhe para a câmera e capture pelo menos 3 fotos, mudando levemente o ângulo."
        submitLabel="Salvar Face ID"
        onSubmit={api.enrollFaceId}
        onDone={(result) => {
          if (result.added.length) refreshUser()
        }}
      />
    </Card>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      toast.success('Senha alterada')
      setCurrent('')
      setNext('')
      setConfirm('')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const mismatch = confirm.length > 0 && confirm !== next

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!mismatch) change.mutate()
  }

  return (
    <Card icon={<KeyRound className="h-4 w-4" />} title="Senha" description="Troque a senha padrão antes de expor o sistema na rede.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Senha atual">
          <input className="field" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres">
          <input className="field" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar" hint={mismatch ? 'As senhas não conferem' : undefined}>
          <input className="field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" loading={change.isPending} disabled={mismatch}>
            Alterar senha
          </Button>
        </div>
      </form>
    </Card>
  )
}

function SystemCard() {
  const { data } = useQuery({ queryKey: ['system'], queryFn: api.system })
  const rows: [string, ReactNode][] = data
    ? [
        ['Modelo de embedding', `${data.model} · ${data.embedding_size}D`],
        ['Detector de rostos', data.detector],
        ['Limiar de identificação', percent(data.match_threshold)],
        ['Limiar do Face ID', percent(data.face_login_threshold)],
        ['Vetores indexados', data.vectors.toLocaleString('pt-BR')],
      ]
    : []
  const health: [string, boolean | undefined, ReactNode][] = [
    ['Modelos de IA', data?.models_ready, <Cpu key="cpu" className="h-3.5 w-3.5" />],
    ['PostgreSQL', data?.database, <Database key="db" className="h-3.5 w-3.5" />],
    ['Qdrant', data?.vector_store, <Server key="q" className="h-3.5 w-3.5" />],
  ]

  return (
    <Card icon={<Cpu className="h-4 w-4" />} title="Sistema" description="Configuração do pipeline de reconhecimento (definida por variáveis de ambiente).">
      {!data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {health.map(([label, ok, icon]) => (
              <Badge key={label} tone={ok ? 'ok' : 'warn'}>
                {icon} {label}
              </Badge>
            ))}
          </div>
          <dl className="divide-y divide-line">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 text-[13px]">
                <dt className="text-muted">{label}</dt>
                <dd className="font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Card>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Configurações" description={`Conectado como ${user?.full_name || user?.username}`} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <FaceIdCard />
          {user?.password_login && <PasswordCard />}
        </div>
        <SystemCard />
      </div>
    </>
  )
}
