import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Square, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

interface SimpleWebcamProps {
  onCapture: (imageSrc: string) => void
  disabled?: boolean
}

const SimpleWebcam: React.FC<SimpleWebcamProps> = ({ onCapture, disabled = false }) => {
  const webcamRef = useRef<Webcam>(null)
  const [isReady, setIsReady] = useState(false)

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  }

  const capture = useCallback(() => {
    if (webcamRef.current && !disabled) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        onCapture(imageSrc)
        toast.success('Foto capturada com sucesso!')
      } else {
        toast.error('Erro ao capturar foto')
      }
    }
  }, [onCapture, disabled])

  const handleUserMedia = () => {
    setIsReady(true)
    toast.success('Câmera iniciada!')
  }

  const handleUserMediaError = (error: any) => {
    console.error('Erro na câmera:', error)
    toast.error('Erro ao acessar câmera. Verifique as permissões.')
    setIsReady(false)
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
          mirrored={true}
        />
        
        {isReady && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded-full">
              Câmera Ativa
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4">
        <button 
          onClick={capture}
          disabled={!isReady || disabled}
          className="btn-mmtec-primary"
        >
          <Camera className="h-4 w-4 mr-2" />
          {disabled ? 'Processando...' : 'Capturar e Reconhecer'}
        </button>
      </div>
    </div>
  )
}

export default SimpleWebcam