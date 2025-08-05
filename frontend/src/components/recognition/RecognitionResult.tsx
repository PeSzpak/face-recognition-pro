import React from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock, User } from 'lucide-react'
import { RecognitionResult as ResultType } from '@/types'

interface RecognitionResultProps {
  result: ResultType
  onNewRecognition?: () => void
}

const RecognitionResult: React.FC<RecognitionResultProps> = ({ 
  result, 
  onNewRecognition 
}) => {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />
      case 'no_match':
        return <XCircle className="h-12 w-12 text-orange-600" />
      case 'no_face':
        return <AlertCircle className="h-12 w-12 text-red-600" />
      case 'error':
      default:
        return <XCircle className="h-12 w-12 text-red-600" />
    }
  }

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'no_match':
        return 'bg-orange-50 border-orange-200'
      case 'no_face':
        return 'bg-red-50 border-red-200'
      case 'error':
      default:
        return 'bg-red-50 border-red-200'
    }
  }

  const getStatusTitle = () => {
    switch (result.status) {
      case 'success':
        return 'Pessoa Identificada!'
      case 'no_match':
        return 'Nenhuma Correspondência'
      case 'no_face':
        return 'Nenhuma Face Detectada'
      case 'error':
      default:
        return 'Falha no Reconhecimento'
    }
  }

  const getStatusMessage = () => {
    switch (result.status) {
      case 'success':
        return `${result.person_name} identificado com ${result.confidence ? (result.confidence * 100).toFixed(1) : '0'}% de confiança.`
      case 'no_match':
        return 'Nenhuma pessoa correspondente encontrada no banco de dados. A pessoa pode não estar registrada.'
      case 'no_face':
        return 'Nenhuma face foi detectada na imagem. Certifique-se de que a imagem contenha uma face clara e visível.'
      case 'error':
      default:
        return result.message || 'Ocorreu um erro durante o reconhecimento. Tente novamente.'
    }
  }

  return (
    <div className={`card border-2 ${getStatusColor()}`}>
      <div className="text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Title */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {getStatusTitle()}
          </h3>
          <p className="text-gray-600">
            {getStatusMessage()}
          </p>
        </div>

        {/* Details */}
        {result.status === 'success' && result.person_name && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <User className="h-8 w-8 text-blue-600" />
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">
                  {result.person_name}
                </h4>
                <p className="text-sm text-gray-500">
                  ID da Pessoa: {result.person_id || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Confiança</p>
                <p className="font-semibold text-green-600">
                  {result.confidence ? (result.confidence * 100).toFixed(1) : '0'}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Tempo de Processamento</p>
                <p className="font-semibold text-gray-900">
                  {result.processing_time ? (result.processing_time * 1000).toFixed(0) : '0'}ms
                </p>
              </div>
            </div>

            {/* Confidence Bar */}
            {result.confidence && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Nível de Confiança</span>
                  <span>{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      result.confidence > 0.8 
                        ? 'bg-green-500' 
                        : result.confidence > 0.6 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Time (for non-success cases) */}
        {result.status !== 'success' && result.processing_time && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Processado em {(result.processing_time * 1000).toFixed(0)}ms</span>
          </div>
        )}

        {/* Confidence for failed recognitions */}
        {(result.status === 'no_match') && result.confidence && result.confidence > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700 mb-2">
              Face detectada, mas confiança muito baixa para identificação
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-orange-600">
                <span>Confiança</span>
                <span>{(result.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-1.5">
                <div
                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {onNewRecognition && (
          <button
            onClick={onNewRecognition}
            className="btn-primary"
          >
            Tentar Novo Reconhecimento
          </button>
        )}
      </div>
    </div>
  )
}

export default RecognitionResult