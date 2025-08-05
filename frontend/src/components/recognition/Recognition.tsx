import React, { useState } from 'react'
import { Camera, Upload, User, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { recognitionService } from '@/services/recognition'
import Loading from '@/components/ui/Loading'
import toast from 'react-hot-toast'
import { RecognitionResult } from '@/types'


const Recognition: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleImageSelected = async (file: File) => {
    setSelectedFile(file)
    setIsProcessing(true)
    setResult(null)

    try {
      const recognitionResult = await recognitionService.identifyFace(file as any)
      setResult(recognitionResult)
      
      if (recognitionResult.recognized && recognitionResult.person_name) {
        toast.success(`Pessoa reconhecida: ${recognitionResult.person_name}`)
      } else {
        toast.error('Pessoa não reconhecida')
      }
    } catch (error: any) {
      console.error('Recognition failed:', error)
      toast.error('Erro no reconhecimento facial')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWebcamCapture = async (imageData: string) => {
    // Convert base64 to File
    const response = await fetch(imageData)
    const blob = await response.blob()
    const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' })
    
    handleImageSelected(file)
  }

  const resetRecognition = () => {
    setResult(null)
    setSelectedFile(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconhecimento Facial</h1>
          <p className="text-gray-600">Faça upload de uma imagem ou use a webcam para reconhecer pessoas</p>
        </div>
        {result && (
          <button onClick={resetRecognition} className="btn-secondary">
            Nova Análise
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload/Capture Section */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Captura de Imagem
            </h2>
            
            <ImageUpload
              onImageSelected={handleImageSelected}
              onWebcamCapture={handleWebcamCapture}
              disabled={isProcessing}
            />
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="card">
              <div className="flex items-center space-x-3">
                <Loading size="sm" />
                <div>
                  <h3 className="font-medium text-gray-900">Processando...</h3>
                  <p className="text-sm text-gray-600">Analisando faces na imagem</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                {result.recognized ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                )}
                Resultado do Reconhecimento
              </h2>

              <div className="space-y-4">
                {result.recognized ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-900">
                          {result.person_name || 'Pessoa Reconhecida'}
                        </h3>
                        <p className="text-sm text-green-700">
                          Reconhecimento bem-sucedido
                        </p>
                      </div>
                    </div>
                    
                    {result.confidence && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Confiança:</span>
                          <span className="font-medium text-green-900">
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${result.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-900">
                          Pessoa Não Reconhecida
                        </h3>
                        <p className="text-sm text-red-700">
                          Nenhuma correspondência encontrada
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-red-600">
                      A pessoa não está cadastrada no sistema ou a qualidade da imagem 
                      não é suficiente para reconhecimento.
                    </p>
                  </div>
                )}

                {/* Processing Time */}
                {result.processing_time && (
                  <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Tempo de processamento:</span>
                    </div>
                    <span className="font-medium">
                      {result.processing_time.toFixed(2)}s
                    </span>
                  </div>
                )}

                {/* Face Location Visualization */}
                {result.face_location && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      Localização da Face Detectada:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Top: {result.face_location.top}px</div>
                      <div>Right: {result.face_location.right}px</div>
                      <div>Bottom: {result.face_location.bottom}px</div>
                      <div>Left: {result.face_location.left}px</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!result && !isProcessing && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Como usar
              </h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </div>
                  <p>Faça upload de uma imagem ou use a webcam para capturar uma foto</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <p>O sistema irá detectar faces na imagem automaticamente</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    3
                  </div>
                  <p>Se a pessoa estiver cadastrada, ela será reconhecida com uma pontuação de confiança</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Recognition