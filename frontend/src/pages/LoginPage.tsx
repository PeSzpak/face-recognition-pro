import { KeyRound, ScanFace, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Camera, type CameraHandle } from '@/components/Camera'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { api, errorCode, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { percent } from '@/lib/format'

const ATTEMPTS = 6
const RETRYABLE = new Set(['no_face', 'unauthorized', 'models_loading'])

function PasswordForm() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      signIn(await api.login(username, password))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Usuário ou e-mail">
        <input className="field h-10" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
      </Field>
      <Field label="Senha">
        <input className="field h-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      {error && <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
        Entrar
      </Button>
      <p className="text-center text-[12px] text-faint">
        Demo: <span className="font-mono text-muted">admin</span> / <span className="font-mono text-muted">admin123</span>
      </p>
    </form>
  )
}

type ScanState = { phase: 'idle' } | { phase: 'scanning'; attempt: number } | { phase: 'failed'; message: string } | { phase: 'success'; name: string; confidence: number }

function FaceLogin() {
  const { signIn } = useAuth()
  const camera = useRef<CameraHandle>(null)
  const [scan, setScan] = useState<ScanState>({ phase: 'idle' })

  async function start() {
    let lastMessage = 'Rosto não reconhecido'
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      setScan({ phase: 'scanning', attempt })
      const frame = await camera.current?.capture()
      if (!frame) break
      try {
        const session = await api.faceLogin(frame)
        setScan({ phase: 'success', name: session.user.full_name || session.user.username, confidence: session.confidence ?? 0 })
        toast.success(`Bem-vindo, ${session.user.full_name || session.user.username}`)
        setTimeout(() => signIn(session), 700)
        return
      } catch (err) {
        lastMessage = errorMessage(err)
        if (!RETRYABLE.has(errorCode(err) ?? '')) break
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    }
    setScan({ phase: 'failed', message: lastMessage })
  }

  const scanning = scan.phase === 'scanning'
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Camera ref={camera} round className="h-56 w-56">
          {scanning && <div className="absolute inset-x-0 h-0.5 animate-scan bg-accent shadow-[0_0_16px_4px_rgb(var(--accent)/0.6)]" />}
        </Camera>
        <div
          className={clsx(
            'pointer-events-none absolute -inset-2 rounded-full border-2 transition-colors',
            scan.phase === 'success' ? 'border-ok' : scan.phase === 'failed' ? 'border-bad/70' : scanning ? 'border-accent animate-pulse' : 'border-line',
          )}
        />
      </div>

      <div className="mt-6 min-h-[44px] text-center text-[13px]">
        {scan.phase === 'idle' && <p className="text-muted">Posicione o rosto no centro do círculo, com boa iluminação.</p>}
        {scanning && <p className="text-accent">Analisando… tentativa {scan.attempt} de {ATTEMPTS}</p>}
        {scan.phase === 'failed' && <p className="text-bad">{scan.message}</p>}
        {scan.phase === 'success' && (
          <p className="text-ok">
            {scan.name} reconhecido(a) · {percent(scan.confidence, 1)}
          </p>
        )}
      </div>

      <Button variant="primary" size="lg" className="mt-2 w-full justify-center" onClick={start} loading={scanning} disabled={scan.phase === 'success'} icon={<ScanFace className="h-4 w-4" />}>
        {scan.phase === 'failed' ? 'Tentar de novo' : 'Escanear rosto'}
      </Button>
      <p className="mt-3 text-center text-[12px] text-faint">Disponível para pessoas com acesso por Face ID liberado no cadastro.</p>
    </div>
  )
}

const FEATURES = [
  { icon: Zap, title: 'Detecção e embedding em uma passada', text: 'RetinaFace + Facenet512, vetores de 512 dimensões.' },
  { icon: Sparkles, title: 'Busca vetorial com Qdrant', text: 'Similaridade de cosseno com candidatos ranqueados.' },
  { icon: ShieldCheck, title: 'Cadastro com controle de qualidade', text: 'Rejeita fotos borradas, com vários rostos ou duplicadas.' },
]

export function LoginPage() {
  const [mode, setMode] = useState<'password' | 'face'>('password')

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-backdrop absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)]" />
        <div className="relative flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="text-[15px] font-semibold">Face Recognition Pro</span>
        </div>

        <div className="relative max-w-md">
          <p className="label mb-4 text-accent">Biometria facial · 100% local</p>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight">
            Identifique pessoas em tempo real, sem mandar uma imagem para a nuvem.
          </h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-[13px] text-muted">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[12px] text-faint">FastAPI · DeepFace · Qdrant · PostgreSQL · React</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-9 w-9" />
            <span className="text-[15px] font-semibold">Face Recognition Pro</span>
          </div>
          <h2 className="text-[22px] font-semibold tracking-tight">Entrar</h2>
          <p className="mt-1 text-muted">Acesse o painel de reconhecimento.</p>
          <div className="mt-6 mb-6">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'password', label: 'Senha', icon: <KeyRound className="h-3.5 w-3.5" /> },
                { value: 'face', label: 'Face ID', icon: <ScanFace className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>
          {mode === 'password' ? <PasswordForm /> : <FaceLogin />}
        </div>
      </section>
    </div>
  )
}
