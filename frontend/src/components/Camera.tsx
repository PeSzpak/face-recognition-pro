import { CameraOff, Loader2 } from 'lucide-react'
import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import Webcam from 'react-webcam'
import clsx from 'clsx'

export interface CameraHandle {
  capture: () => Promise<Blob | null>
  size: () => { width: number; height: number }
}

interface CameraProps {
  className?: string
  children?: ReactNode
  round?: boolean
}

type CameraState = 'starting' | 'ready' | 'denied'

const CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }

export const Camera = forwardRef<CameraHandle, CameraProps>(function Camera({ className, children, round }, ref) {
  const webcam = useRef<Webcam>(null)
  const [state, setState] = useState<CameraState>('starting')

  useImperativeHandle(ref, () => ({
    // Captures the raw (un-mirrored) frame so camera shots match uploaded photos.
    capture() {
      const video = webcam.current?.video
      if (!video || !video.videoWidth) return Promise.resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    },
    size() {
      const video = webcam.current?.video
      return { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 }
    },
  }))

  return (
    <div className={clsx('relative overflow-hidden bg-black', round ? 'rounded-full' : 'rounded-xl', className)}>
      <Webcam
        ref={webcam}
        audio={false}
        mirrored
        videoConstraints={CONSTRAINTS}
        onUserMedia={() => setState('ready')}
        onUserMediaError={() => setState('denied')}
        className={clsx('h-full w-full', round ? 'object-cover' : 'object-contain')}
      />
      {state === 'ready' && children}
      {state === 'starting' && (
        <div className="absolute inset-0 grid place-items-center text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {state === 'denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-muted">
          <CameraOff className="h-7 w-7" />
          <p className="text-[13px]">Sem acesso à câmera. Libere a permissão no navegador e recarregue a página.</p>
        </div>
      )}
    </div>
  )
})
