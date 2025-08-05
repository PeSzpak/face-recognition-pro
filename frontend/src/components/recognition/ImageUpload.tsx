import React, { useState, useRef } from 'react'
import { Upload, Camera, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import SimpleWebcam from '../SimpleWebcam'

interface ImageUploadProps {
  onImageSelected: (file: File) => void
  onWebcamCapture?: (imageData: string) => void
  disabled?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  onWebcamCapture,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelection = (file: File) => {
    if (!isValidFile(file)) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
      setShowWebcam(false)
    }
    reader.readAsDataURL(file)
    onImageSelected(file)
  }

  const isValidFile = (file: File) => {
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    
    if (!supportedFormats.includes(file.type)) {
      toast.error('Formato não suportado. Use JPEG, PNG ou WebP.')
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB')
      return false
    }

    return true
  }

  const handleWebcamCapture = (imageData: string) => {
    setSelectedImage(imageData)
    setShowWebcam(false)
    if (onWebcamCapture) {
      onWebcamCapture(imageData)
    }
    toast.success('📸 Foto capturada!')
  }

  const clearImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* WEBCAM SIMPLES */}
      {showWebcam && (
        <SimpleWebcam
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}

      {/* IMAGEM SELECIONADA */}
      {selectedImage && !showWebcam && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-blue-500" />
              ✅ Imagem Selecionada
            </h3>
            <button
              onClick={clearImage}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Remover
            </button>
          </div>
          
          <img
            src={selectedImage}
            alt="Selected"
            className="w-full max-w-md mx-auto rounded-lg border border-gray-200 shadow-sm"
          />
        </div>
      )}

      {/* ÁREA DE UPLOAD */}
      {!selectedImage && !showWebcam && (
        <div className="space-y-4">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              📁 Upload de Imagem
            </h3>
            <p className="text-gray-600 mb-4">
              Arraste uma imagem aqui ou clique para selecionar
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Formatos aceitos: JPEG, PNG, WebP</p>
              <p>Tamanho máximo: 10MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              📁 Selecionar Arquivo
            </button>
            
            <button
              onClick={() => setShowWebcam(true)}
              disabled={disabled}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Camera className="h-4 w-4 mr-2" />
              🎥 Usar Webcam
            </button>
          </div>
        </div>
      )}

      {/* INPUT OCULTO */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelection(file)
        }}
        className="hidden"
      />
    </div>
  )
}

export default ImageUpload