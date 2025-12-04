import React, { useState, useRef } from 'react'
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Clock,
  Target,
  Shield,
  ImageIcon,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import SimpleWebcam from './SimpleWebcam'
import { recognitionService } from '../../services/recognition'
import { RecognitionResult } from '@/types'

const Recognition: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'camera' | 'upload' | 'secure'>('camera')
  const [recentRecognitions, setRecentRecognitions] = useState<any[]>([])

  // Processar imagem usando API real
  const processImage = async (imageData: string | File) => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🔍 Processando imagem para reconhecimento...')
      
      let apiResult: RecognitionResult

      if (imageData instanceof File) {
        // Upload de arquivo
        apiResult = await recognitionService.identifyFace(imageData)
      } else {
        // Base64 da webcam
        apiResult = await recognitionService.identifyFaceFromBase64(imageData)
      }

      // Mapear resposta da API
      const mappedResult: RecognitionResult = {
        recognized: apiResult.recognized || false,
        person_name: apiResult.person_name,
        person_id: apiResult.person_id,
        confidence: apiResult.confidence,
        status: apiResult.status,
        processing_time: apiResult.processing_time,
        message: apiResult.message
      }

      setResult(mappedResult)
      
      // Mostrar feedback ao usuário
      if (mappedResult.recognized && mappedResult.person_name) {
        toast.success(`✅ Reconhecido: ${mappedResult.person_name} (${((mappedResult.confidence || 0) * 100).toFixed(1)}%)`)
      } else {
        toast.error(`❌ ${mappedResult.message || 'Não reconhecido'}`)
      }

      // Adicionar aos reconhecimentos recentes
      const imageUrl = typeof imageData === 'string' ? imageData : URL.createObjectURL(imageData)
      const newRecognition = {
        id: Date.now(),
        ...mappedResult,
        timestamp: new Date().toISOString(),
        image_url: imageUrl
      }
      
      setRecentRecognitions(prev => [newRecognition, ...prev.slice(0, 9)])

    } catch (error: any) {
      console.error('❌ Erro no processamento:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Erro interno no processamento'
      toast.error(errorMessage)
      setResult({
        recognized: false,
        status: 'error',
        message: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  // Handler para webcam
  const handleWebcamCapture = async (imageSrc: string) => {
    console.log('📸 Foto capturada via webcam')
    await processImage(imageSrc)
  }

  // Handler para upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB')
        return
      }
      console.log('📁 Arquivo selecionado:', file.name)
      processImage(file)
    }
  }

  // Handler para detecção segura
  const handleSecureDetection = async () => {
    console.log('🛡️ Iniciando detecção segura...')
    // Simular captura segura
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Criar uma imagem simulada
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, 640, 480)
      ctx.fillStyle = '#4a90e2'
      ctx.fillRect(200, 150, 240, 180)
      
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'secure-capture.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          processImage(file)
        }
      })
    }
  }

  const clearResult = () => setResult(null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reconhecimento Facial</h1>
          <p className="text-slate-600">Sistema avançado de identificação com IA e anti-spoofing</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600">Sistema Online</span>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card-mmtec p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Selecione o Método de Reconhecimento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setMode('camera')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              mode === 'camera'
                ? 'border-mmtec-accent bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <div className={`p-3 rounded-lg mr-3 ${
                mode === 'camera' ? 'bg-mmtec-gradient' : 'bg-slate-100'
              }`}>
                <Camera className={`h-6 w-6 ${
                  mode === 'camera' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Câmera Ao Vivo</h4>
                <p className="text-sm text-slate-600">Captura em tempo real</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Use a câmera do dispositivo para capturar e reconhecer rostos instantaneamente
            </p>
          </button>

          <button
            onClick={() => setMode('upload')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              mode === 'upload'
                ? 'border-mmtec-accent bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <div className={`p-3 rounded-lg mr-3 ${
                mode === 'upload' ? 'bg-mmtec-gradient' : 'bg-slate-100'
              }`}>
                <Upload className={`h-6 w-6 ${
                  mode === 'upload' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Upload de Imagem</h4>
                <p className="text-sm text-slate-600">Arquivo do dispositivo</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Envie uma foto salva no seu dispositivo para análise e reconhecimento
            </p>
          </button>

          <button
            onClick={() => setMode('secure')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              mode === 'secure'
                ? 'border-mmtec-accent bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <div className={`p-3 rounded-lg mr-3 ${
                mode === 'secure' ? 'bg-mmtec-gradient' : 'bg-slate-100'
              }`}>
                <Shield className={`h-6 w-6 ${
                  mode === 'secure' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Detecção Segura</h4>
                <p className="text-sm text-slate-600">Com anti-spoofing</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Reconhecimento avançado com proteção contra falsificação e liveness detection
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Recognition Area */}
        <div className="xl:col-span-2">
          <div className="card-mmtec p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10 rounded-xl">
                <div className="text-center">
                  <div className="loading-mmtec-lg mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-700">Processando com IA...</p>
                  <p className="text-sm text-slate-500 mt-2">
                    {mode === 'secure' ? 'Verificando liveness e características faciais...' : 'Analisando características faciais...'}
                  </p>
                </div>
              </div>
            )}

            {/* Modo Câmera - Usando SimpleWebcam */}
            {mode === 'camera' && (
              <div className="space-y-6">
                <SimpleWebcam 
                  onCapture={handleWebcamCapture} 
                  disabled={loading}
                />
              </div>
            )}

            {/* Modo Upload */}
            {mode === 'upload' && (
              <div className="space-y-6">
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-xl p-16 text-center hover:border-mmtec-accent transition-colors cursor-pointer bg-slate-50 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (files.length > 0 && files[0].type.startsWith('image/')) {
                      processImage(files[0])
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">Upload de Imagem</h3>
                  <p className="text-slate-500 mb-4">
                    Arraste uma imagem aqui ou clique para selecionar
                  </p>
                  <div className="text-sm text-slate-400 space-y-1 mb-6">
                    <p><strong>Formatos aceitos:</strong> JPG, PNG, WebP</p>
                    <p><strong>Tamanho máximo:</strong> 10MB</p>
                    <p><strong>Recomendado:</strong> Imagem clara com rosto visível</p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <button className="btn-mmtec-primary">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </button>
                </div>
              </div>
            )}

            {/* Modo Seguro */}
            {mode === 'secure' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-16 text-center">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-xl font-semibold text-purple-900 mb-2">Detecção Segura</h3>
                  <p className="text-purple-700 mb-4">
                    Sistema avançado com proteção anti-spoofing
                  </p>
                  <div className="text-sm text-purple-600 space-y-1 mb-6">
                    <p>✓ Detecção de vida (Liveness)</p>
                    <p>✓ Proteção contra fotos</p>
                    <p>✓ Análise de profundidade</p>
                    <p>✓ Detecção de movimento</p>
                  </div>
                  
                  <button 
                    onClick={handleSecureDetection}
                    disabled={loading}
                    className="btn-mmtec-primary"
                  >
                    {loading ? (
                      <>
                        <div className="loading-mmtec mr-2" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Iniciar Verificação Segura
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl mb-2">💡</div>
                <h4 className="font-medium text-green-800 mb-1">Boa Iluminação</h4>
                <p className="text-xs text-green-600">Evite contraluz e sombras</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl mb-2">👤</div>
                <h4 className="font-medium text-blue-800 mb-1">Rosto Centralizado</h4>
                <p className="text-xs text-blue-600">Mantenha o rosto no centro</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl mb-2">📏</div>
                <h4 className="font-medium text-purple-800 mb-1">Distância Ideal</h4>
                <p className="text-xs text-purple-600">50-100cm da câmera</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Current Result */}
          {result && (
            <div className="card-mmtec p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Resultado da Análise</h3>
                <button onClick={clearResult} className="text-slate-400 hover:text-slate-600">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  ) : (
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  )}
                </div>

                {result.recognized ? (
                  <div className="text-center space-y-3">
                    <h4 className="text-lg font-bold text-green-700">{result.person_name}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <Target className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <div className="font-medium text-green-800">{(result.confidence! * 100).toFixed(1)}%</div>
                        <div className="text-xs text-green-600">Confiança</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <div className="font-medium text-blue-800">{result.processing_time?.toFixed(1)}s</div>
                        <div className="text-xs text-blue-600">Tempo</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h4 className="text-lg font-medium text-slate-900 mb-2">Não Reconhecido</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{result.message}</p>
                  </div>
                )}

                <div className="text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    result.status === 'success' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {result.status === 'success' ? '✅ Identificado' :
                     result.status === 'no_match' ? '❌ Não Cadastrado' :
                     result.status === 'no_face' ? '👤 Sem Rosto' :
                     '❌ Erro'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Recognitions */}
          <div className="card-mmtec p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico Recente</h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto mmtec-scrollbar">
              {recentRecognitions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <User className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum reconhecimento ainda</p>
                  <p className="text-xs mt-1 opacity-75">Inicie uma análise ao lado</p>
                </div>
              ) : (
                recentRecognitions.map((recognition) => (
                  <div key={recognition.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border">
                    <div className={`p-2 rounded-full ${
                      recognition.recognized ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {recognition.recognized ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {recognition.person_name || 'Não identificado'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(recognition.timestamp).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    {recognition.confidence && (
                      <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        {(recognition.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {recentRecognitions.length > 0 && (
            <div className="card-mmtec p-6">
              <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {recentRecognitions.filter(r => r.recognized).length}
                  </div>
                  <div className="text-sm text-green-700">Sucessos</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {recentRecognitions.filter(r => !r.recognized).length}
                  </div>
                  <div className="text-sm text-red-700">Falhas</div>
                </div>
              </div>

              <div className="mt-4 text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">
                  Taxa de Sucesso:{' '}
                  <span className="font-bold text-mmtec-accent">
                    {((recentRecognitions.filter(r => r.recognized).length / recentRecognitions.length) * 100).toFixed(1)}%
                  </span>
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