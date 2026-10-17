import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Aperture, Camera as CameraIcon, ImageUp, Radio, RotateCcw, ScanFace, UserX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Camera, type CameraHandle } from '@/components/Camera'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { FaceOverlay } from '@/components/FaceOverlay'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { api, errorMessage } from '@/lib/api'
import { percent } from '@/lib/format'
import type { IdentifyResponse } from '@/lib/types'

type Mode = 'camera' | 'upload'

const LIVE_PAUSE_MS = 350

function ResultsPanel({ result, selected, onSelect }: { result: IdentifyResponse | null; selected?: number; onSelect: (i: number) => void }) {
  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center text-muted">
        <ScanFace className="mb-3 h-8 w-8 text-faint" />
        <p className="text-[13px]">Os rostos encontrados aparecem aqui, com a pessoa mais provável e a similaridade.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[12px] text-muted">
        <span>
          {result.faces.length} {result.faces.length === 1 ? 'rosto' : 'rostos'}
        </span>
        <span className="font-mono">
          {result.processing_ms} ms · limiar {percent(result.threshold)}
        </span>
      </div>

      {result.faces.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <UserX className="mb-3 h-7 w-7 text-faint" />
          <p className="font-medium">Nenhum rosto detectado</p>
          <p className="mt-1 text-[13px] text-muted">Aproxime o rosto da câmera, olhe de frente e melhore a iluminação.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {result.faces.map((face, index) => (
            <li
              key={index}
              onClick={() => onSelect(index)}
              className={clsx('cursor-pointer px-5 py-4 transition-colors', selected === index ? 'bg-raised/70' : 'hover:bg-raised/40')}
            >
              <div className="flex items-center gap-3">
                {face.person ? (
                  <PersonAvatar person={{ id: face.person.person_id, name: face.person.name, cover_sample_id: face.person.cover_sample_id }} />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-warn/10 text-warn ring-1 ring-warn/30">
                    <UserX className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {face.person ? (
                    <Link to={`/people/${face.person.person_id}`} className="block truncate font-medium hover:underline">
                      {face.person.name}
                    </Link>
                  ) : (
                    <div className="font-medium">Não identificado</div>
                  )}
                  <div className="text-[12px] text-faint">Qualidade da imagem {percent(face.quality)}</div>
                </div>
                <Badge tone={face.person ? 'ok' : 'warn'} dot>
                  {face.person ? 'Identificado' : 'Desconhecido'}
                </Badge>
              </div>

              {face.candidates.length > 0 && (
                <div className="mt-3 space-y-2 pl-[52px]">
                  {face.candidates.map((candidate) => (
                    <div key={candidate.person_id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3 text-[12px]">
                      <span className="truncate text-muted">{candidate.name}</span>
                      <ConfidenceMeter value={candidate.similarity} threshold={result.threshold} compact />
                    </div>
                  ))}
                </div>
              )}
              {!face.person && face.candidates.length === 0 && (
                <p className="mt-2 pl-[52px] text-[12px] text-faint">Nenhuma pessoa cadastrada se parece com este rosto.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CameraStage({ onResult }: { onResult: (result: IdentifyResponse | null) => void }) {
  const camera = useRef<CameraHandle>(null)
  const queryClient = useQueryClient()
  const [live, setLive] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [frame, setFrame] = useState<IdentifyResponse | null>(null)

  const show = useCallback(
    (result: IdentifyResponse | null) => {
      setFrame(result)
      onResult(result)
    },
    [onResult],
  )

  useEffect(() => {
    if (!live) return
    let cancelled = false
    async function loop() {
      while (!cancelled) {
        const blob = await camera.current?.capture()
        if (blob) {
          try {
            const result = await api.identify(blob, 'camera', false)
            if (!cancelled) show(result)
          } catch {
            // Transient failures (models still loading, network blips) shouldn't stop the preview.
          }
        }
        await new Promise((resolve) => setTimeout(resolve, blob ? LIVE_PAUSE_MS : 500))
      }
    }
    loop()
    return () => {
      cancelled = true
    }
  }, [live, show])

  async function captureAndRecord() {
    const blob = await camera.current?.capture()
    if (!blob) return
    setLive(false)
    setCapturing(true)
    try {
      const result = await api.identify(blob, 'camera', true)
      show(result)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Reconhecimento registrado no histórico')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Camera ref={camera} className="aspect-video w-full rounded-none">
        {frame && <FaceOverlay faces={frame.faces} width={frame.image_width} height={frame.image_height} mirrored />}
        {live && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-bad backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bad" /> Ao vivo
          </div>
        )}
      </Camera>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          <Radio className="h-3.5 w-3.5" /> Prévia contínua <span className="text-faint">(não registra)</span>
        </label>
        <Button variant="primary" onClick={captureAndRecord} loading={capturing} icon={<Aperture className="h-4 w-4" />}>
          Capturar e registrar
        </Button>
      </div>
    </div>
  )
}

function UploadStage({ onResult }: { onResult: (result: IdentifyResponse | null) => void }) {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<IdentifyResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setPreview(URL.createObjectURL(file))
      setResult(null)
      onResult(null)
      setLoading(true)
      try {
        const response = await api.identify(file, 'upload', true)
        setResult(response)
        onResult(response)
        queryClient.invalidateQueries({ queryKey: ['events'] })
        queryClient.invalidateQueries({ queryKey: ['overview'] })
      } catch (err) {
        toast.error(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [onResult, queryClient],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    noClick: !!preview,
  })

  return (
    <div className="flex h-full flex-col">
      <div
        {...getRootProps()}
        className={clsx(
          'relative grid aspect-video w-full place-items-center overflow-hidden bg-canvas transition-colors',
          !preview && 'cursor-pointer',
          isDragActive && 'bg-accent/5',
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <>
            {/* Image and overlay share one box so the SVG viewBox lines up with the rendered pixels. */}
            <div className="absolute inset-0">
              <img src={preview} alt="Imagem enviada" className="h-full w-full object-contain" />
              {result && <FaceOverlay faces={result.faces} width={result.image_width} height={result.image_height} />}
            </div>
            {loading && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 h-0.5 animate-scan bg-accent shadow-[0_0_20px_6px_rgb(var(--accent)/0.5)]" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-faint text-muted">
              <ImageUp className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{isDragActive ? 'Solte para analisar' : 'Arraste uma foto ou clique para escolher'}</p>
              <p className="mt-1 text-[12px] text-faint">JPG, PNG ou WebP · vários rostos por imagem</p>
            </div>
          </div>
        )}
      </div>
      {preview && (
        <div className="flex justify-end border-t border-line px-4 py-3">
          <Button onClick={open} icon={<RotateCcw className="h-4 w-4" />} disabled={loading}>
            Outra imagem
          </Button>
        </div>
      )}
    </div>
  )
}

export function RecognizePage() {
  const [mode, setMode] = useState<Mode>('camera')
  const [result, setResult] = useState<IdentifyResponse | null>(null)
  const [selected, setSelected] = useState<number>()

  const handleResult = useCallback((next: IdentifyResponse | null) => {
    setResult(next)
    setSelected(undefined)
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    handleResult(null)
  }

  return (
    <>
      <PageHeader
        title="Reconhecer"
        description="Identifique pessoas pela câmera em tempo real ou a partir de uma foto."
        actions={
          <Segmented
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'camera', label: 'Câmera', icon: <CameraIcon className="h-3.5 w-3.5" /> },
              { value: 'upload', label: 'Imagem', icon: <ImageUp className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden">
          {mode === 'camera' ? <CameraStage onResult={handleResult} /> : <UploadStage onResult={handleResult} />}
        </section>
        <aside className="panel min-h-[320px] overflow-hidden">
          <ResultsPanel result={result} selected={selected} onSelect={setSelected} />
        </aside>
      </div>
    </>
  )
}
