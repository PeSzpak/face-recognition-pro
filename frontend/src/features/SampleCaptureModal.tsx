import clsx from 'clsx'
import { Aperture, Camera as CameraIcon, ImageUp, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Camera, type CameraHandle } from '@/components/Camera'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { errorMessage } from '@/lib/api'
import type { SampleUploadResult } from '@/lib/types'

const MAX_IMAGES = 10

interface SampleCaptureModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  submitLabel: string
  onSubmit: (images: Blob[]) => Promise<SampleUploadResult>
  onDone?: (result: SampleUploadResult) => void
  initialMode?: 'camera' | 'upload'
}

const TIPS = ['Rosto inteiro, de frente e sem óculos escuros', 'Boa iluminação, sem sombra forte', 'Varie um pouco o ângulo entre as fotos']

function Thumb({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-line">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-ink opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remover"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function SampleCaptureModal({ open, onClose, title, description, submitLabel, onSubmit, onDone, initialMode = 'upload' }: SampleCaptureModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [images, setImages] = useState<Blob[]>([])
  const [rejected, setRejected] = useState<SampleUploadResult['rejected']>([])
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)
  const camera = useRef<CameraHandle>(null)

  useEffect(() => {
    if (open) {
      setImages([])
      setRejected([])
      setMode(initialMode)
    }
  }, [open, initialMode])

  const add = (blobs: Blob[]) => setImages((current) => [...current, ...blobs].slice(0, MAX_IMAGES))

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: add,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
  })

  async function snap() {
    const blob = await camera.current?.capture()
    if (!blob) return
    setFlash(true)
    setTimeout(() => setFlash(false), 150)
    add([blob])
  }

  async function submit() {
    setSaving(true)
    try {
      const result = await onSubmit(images)
      setRejected(result.rejected)
      if (result.added.length) toast.success(`${result.added.length} ${result.added.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}`)
      if (result.rejected.length === 0) {
        onDone?.(result)
        onClose()
      } else {
        const rejectedNames = new Set(result.rejected.map((r) => r.file_name))
        setImages((current) => current.filter((blob, i) => rejectedNames.has(blob instanceof File ? blob.name : `captura-${i + 1}.jpg`)))
        onDone?.(result)
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={title}
      description={description}
      footer={
        <>
          <span className="mr-auto self-center text-[12px] text-faint">
            {images.length}/{MAX_IMAGES} imagens
          </span>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!images.length} icon={<Upload className="h-4 w-4" />}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'upload', label: 'Enviar arquivos', icon: <ImageUp className="h-3.5 w-3.5" /> },
            { value: 'camera', label: 'Usar câmera', icon: <CameraIcon className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_200px]">
        {mode === 'camera' ? (
          <div>
            <Camera ref={camera} className="aspect-video w-full">
              <div className={clsx('pointer-events-none absolute inset-0 bg-white transition-opacity duration-150', flash ? 'opacity-60' : 'opacity-0')} />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-dashed border-accent/50" />
            </Camera>
            <Button className="mt-3 w-full justify-center" onClick={snap} disabled={images.length >= MAX_IMAGES} icon={<Aperture className="h-4 w-4" />}>
              Capturar foto
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={clsx(
              'grid aspect-video cursor-pointer place-items-center rounded-xl border border-dashed text-center transition-colors',
              isDragActive ? 'border-accent bg-accent/5' : 'border-line hover:border-faint',
            )}
          >
            <input {...getInputProps()} />
            <div className="p-6">
              <ImageUp className="mx-auto mb-3 h-6 w-6 text-muted" />
              <p className="font-medium">Arraste fotos ou clique para escolher</p>
              <p className="mt-1 text-[12px] text-faint">Até {MAX_IMAGES} imagens por envio</p>
            </div>
          </div>
        )}

        <div>
          <p className="label mb-2">Dicas</p>
          <ul className="space-y-1.5 text-[12px] text-muted">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {images.map((blob, index) => (
            <Thumb key={index} blob={blob} onRemove={() => setImages((current) => current.filter((_, i) => i !== index))} />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="mt-5 rounded-lg border border-warn/30 bg-warn/5 p-3">
          <p className="mb-2 text-[13px] font-medium text-warn">Algumas imagens não foram aceitas</p>
          <ul className="space-y-1 text-[12px] text-muted">
            {rejected.map((r, i) => (
              <li key={i}>
                <span className="font-mono text-faint">{r.file_name}</span> · {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
