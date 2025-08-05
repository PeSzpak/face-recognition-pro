import React, { useState, useRef } from 'react'
import { Upload, Camera, X, Image as ImageIcon, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import SimpleWebcam from '../SimpleWebcam'
import LiveDetection from '../LiveDetection'

interface ImageUploadProps {
  onImageSelected: (file: File) => void
  onWebcamCapture?: (imageData: string) => void
  onLiveDetection?: (result: any) => void
  disabled?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  onWebcamCapture,
  onLiveDetection,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<'none' | 'simple' | 'secure'>('none')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  // File selection and validation
  const handleFileSelection = (file: File) => {
    console.log(' Arquivo selecionado:', file.name, file.type, file.size)
    
    if (!isValidFile(file)) {
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      console.log(' Arquivo lido com sucesso, tamanho:', result.length)
      setSelectedImage(result)
      setActiveMode('none')
    }
    reader.onerror = (error) => {
      console.error(' Erro ao ler arquivo:', error)
      toast.error('Erro ao ler o arquivo selecionado')
    }
    reader.readAsDataURL(file)
    
    // Chamar callback do componente pai
    onImageSelected(file)
  }

  const isValidFile = (file: File) => {
    const supportedFormats = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'image/bmp',
      'image/tiff'
    ]
    
    // Validar formato
    if (!supportedFormats.includes(file.type)) {
      toast.error(`Formato não suportado: ${file.type}. Use JPEG, PNG, WebP, BMP ou TIFF.`)
      return false
    }

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(` Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: 10MB`)
      return false
    }

    // Validar tamanho mínimo (1KB)
    if (file.size < 1024) {
      toast.error(' Arquivo muito pequeno. Mínimo: 1KB')
      return false
    }

    return true
  }

  // Handlers para diferentes modos
  const handleLiveDetectionResult = (result: any) => {
    console.log(' Resultado da detecção segura:', result)
    
    if (result.recognized) {
      toast.success(`🎯 ${result.person_name} reconhecido! Confiança: ${(result.confidence * 100).toFixed(1)}%`)
    } else if (result.spoofing_detected) {
      toast.error(' Possível tentativa de spoofing detectada!')
    } else if (result.status === 'no_face') {
      toast.error(' Nenhum rosto detectado na imagem')
    } else if (result.status === 'no_match') {
      toast.error(' Pessoa não reconhecida no sistema')
    } else {
      toast.error(' Erro no reconhecimento facial')
    }
    
    setActiveMode('none')
    if (onLiveDetection) {
      onLiveDetection(result)
    }
  }

  const handleSimpleCapture = (imageData: string) => {
    console.log(' Foto capturada via webcam simples, tamanho:', imageData.length)
    setSelectedImage(imageData)
    setActiveMode('none')
    if (onWebcamCapture) {
      onWebcamCapture(imageData)
    }
    toast.success(' Foto capturada com sucesso!')
  }

  const clearImage = () => {
    console.log('Removendo imagem selecionada')
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.success(' Imagem removida')
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-6">
      {/* LIVE DETECTION SEGURA */}
      {activeMode === 'secure' && (
        <div className="animate-fadeIn">
          <LiveDetection
            onResult={handleLiveDetectionResult}
            onClose={() => {
              console.log('🔒 Fechando detecção segura')
              setActiveMode('none')
            }}
          />
        </div>
      )}

      {/* WEBCAM SIMPLES */}
      {activeMode === 'simple' && (
        <div className="animate-fadeIn">
          <SimpleWebcam
            onCapture={handleSimpleCapture}
            onClose={() => {
              console.log('📸 Fechando webcam simples')
              setActiveMode('none')
            }}
          />
        </div>
      )}

      {/* IMAGEM SELECIONADA */}
      {selectedImage && activeMode === 'none' && (
        <div className="bg-white rounded-lg border-2 border-green-500 p-6 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-green-700 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              ✅ Imagem Selecionada
            </h3>
            <button
              onClick={clearImage}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-red-600 rounded-md hover:bg-red-600 flex items-center transition-all"
            >
              <X className="h-4 w-4 mr-2" />
              Remover
            </button>
          </div>
          
          <div className="relative">
            <img
              src={selectedImage}
              alt="Imagem selecionada para reconhecimento"
              className="w-full max-w-lg mx-auto rounded-lg border-2 border-gray-200 shadow-md"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
              ✅ PRONTA
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE UPLOAD E SELEÇÃO */}
      {activeMode === 'none' && !selectedImage && (
        <div className="space-y-6 animate-fadeIn">
          {/* ZONA DE DROP */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              isDragging ? 'text-blue-700' : 'text-gray-900'
            }`}>
              {isDragging ? '📂 Solte a imagem aqui!' : '📁 Upload de Imagem'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isDragging 
                ? 'Solte para fazer upload' 
                : 'Arraste uma imagem aqui ou clique para selecionar'
              }
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Formatos aceitos:</strong> JPEG, PNG, WebP, BMP, TIFF</p>
              <p><strong>Tamanho:</strong> Entre 1KB e 10MB</p>
              <p><strong>Recomendado:</strong> Imagem clara com rosto visível</p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={openFileDialog}
              disabled={disabled}
              className="flex items-center justify-center px-6 py-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              📁 Selecionar Arquivo
            </button>
            
            <button
              onClick={() => {
                console.log('📸 Iniciando webcam simples')
                setActiveMode('simple')
              }}
              disabled={disabled}
              className="flex items-center justify-center px-6 py-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              <Camera className="h-5 w-5 mr-2" />
              📸 Webcam Simples
            </button>

            <button
              onClick={() => {
                console.log('🛡️ Iniciando detecção segura')
                setActiveMode('secure')
              }}
              disabled={disabled}
              className="flex items-center justify-center px-6 py-4 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              <Shield className="h-5 w-5 mr-2" />
              🛡️ Detecção Segura
            </button>
          </div>

          {/* DESCRIÇÕES DOS MODOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-700 mb-2">📁 Arquivo</h4>
              <p className="text-blue-600">Upload de imagem salva no dispositivo</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-700 mb-2">📸 Webcam</h4>
              <p className="text-gray-600">Captura rápida de foto pela câmera</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-700 mb-2">🛡️ Seguro</h4>
              <p className="text-purple-600">Reconhecimento com anti-spoofing</p>
            </div>
          </div>

          {/* STATUS DO SISTEMA */}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Sistema Online
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Câmera Disponível
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              Anti-spoofing Ativo
            </div>
          </div>
        </div>
      )}

      {/* INPUT OCULTO */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/bmp,image/tiff"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            console.log('📁 Arquivo selecionado via input:', file.name)
            handleFileSelection(file)
          }
        }}
        className="hidden"
        disabled={disabled}
      />

      {/* CSS ANIMATIONS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ImageUpload