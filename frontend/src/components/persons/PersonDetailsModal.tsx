import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Eye,
  Download,
  Edit,
  Trash2,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Person {
  id: string
  name: string
  email?: string
  department?: string
  position?: string
  phone?: string
  photos: string[]
  status: 'active' | 'inactive'
  created_at: string
  last_recognition?: string
  recognition_count: number
  notes?: string
}

interface RecognitionHistory {
  id: string
  timestamp: string
  confidence: number
  location?: string
  camera_id?: string
  image_url?: string
  processing_time: number
  status: 'success' | 'failed'
}

interface PersonDetailsModalProps {
  person: Person
  onClose: () => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
}

const PersonDetailsModal: React.FC<PersonDetailsModalProps> = ({
  person,
  onClose,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'history'>('overview')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [historySearch, setHistorySearch] = useState('')

  // Mock data para histórico de reconhecimentos
  const mockHistory: RecognitionHistory[] = [
    {
      id: '1',
      timestamp: '2024-08-05T14:30:00Z',
      confidence: 0.95,
      location: 'Entrada Principal',
      camera_id: 'CAM-001',
      image_url: '/api/placeholder/300/300',
      processing_time: 1.2,
      status: 'success'
    },
    {
      id: '2',
      timestamp: '2024-08-05T09:15:00Z',
      confidence: 0.87,
      location: 'Recepção',
      camera_id: 'CAM-002',
      image_url: '/api/placeholder/300/301',
      processing_time: 1.8,
      status: 'success'
    },
    {
      id: '3',
      timestamp: '2024-08-04T16:45:00Z',
      confidence: 0.72,
      location: 'Laboratório',
      camera_id: 'CAM-003',
      processing_time: 2.1,
      status: 'failed'
    },
    {
      id: '4',
      timestamp: '2024-08-04T11:20:00Z',
      confidence: 0.92,
      location: 'Entrada Principal',
      camera_id: 'CAM-001',
      image_url: '/api/placeholder/300/302',
      processing_time: 1.5,
      status: 'success'
    },
    {
      id: '5',
      timestamp: '2024-08-03T08:30:00Z',
      confidence: 0.89,
      location: 'Estacionamento',
      camera_id: 'CAM-004',
      image_url: '/api/placeholder/300/303',
      processing_time: 1.9,
      status: 'success'
    }
  ]

  useEffect(() => {
    // Simular carregamento do histórico
    const loadHistory = async () => {
      setHistoryLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setRecognitionHistory(mockHistory)
      setHistoryLoading(false)
    }
    
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100'
    if (confidence >= 0.8) return 'text-blue-600 bg-blue-100'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const filteredHistory = recognitionHistory.filter(record => {
    const matchesFilter = historyFilter === 'all' || record.status === historyFilter
    const matchesSearch = !historySearch || 
      record.location?.toLowerCase().includes(historySearch.toLowerCase()) ||
      record.camera_id?.toLowerCase().includes(historySearch.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const successRate = recognitionHistory.length > 0 
    ? (recognitionHistory.filter(r => r.status === 'success').length / recognitionHistory.length) * 100
    : 0

  const avgConfidence = recognitionHistory.length > 0
    ? recognitionHistory
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + r.confidence, 0) / 
      recognitionHistory.filter(r => r.status === 'success').length
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {person.photos.length > 0 ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                    <img
                      src={person.photos[0]}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(person.status)}`}>
                  {person.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{person.name}</h2>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  {person.position && <span>{person.position}</span>}
                  {person.department && (
                    <>
                      <span>•</span>
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {person.department}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(person)}
                className="btn-mmtec-outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-mmtec-accent text-mmtec-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'photos'
                  ? 'border-mmtec-accent text-mmtec-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Fotos ({person.photos.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-mmtec-accent text-mmtec-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Histórico ({person.recognition_count})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto mmtec-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{person.photos.length}</div>
                  <div className="text-sm text-blue-700">Fotos Cadastradas</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{person.recognition_count}</div>
                  <div className="text-sm text-green-700">Reconhecimentos</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{successRate.toFixed(1)}%</div>
                  <div className="text-sm text-purple-700">Taxa de Sucesso</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{(avgConfidence * 100).toFixed(1)}%</div>
                  <div className="text-sm text-orange-700">Confiança Média</div>
                </div>
              </div>

              {/* Informações Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-mmtec p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Informações de Contato</h3>
                  <div className="space-y-3">
                    {person.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-3 text-slate-400" />
                        <span className="text-slate-600">Email:</span>
                        <span className="ml-2 text-slate-900">{person.email}</span>
                      </div>
                    )}
                    {person.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-3 text-slate-400" />
                        <span className="text-slate-600">Telefone:</span>
                        <span className="ml-2 text-slate-900">{person.phone}</span>
                      </div>
                    )}
                    {person.department && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-3 text-slate-400" />
                        <span className="text-slate-600">Departamento:</span>
                        <span className="ml-2 text-slate-900">{person.department}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-mmtec p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Informações do Sistema</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="text-slate-600">Cadastrado em:</span>
                      <span className="ml-2 text-slate-900">{formatDate(person.created_at).date}</span>
                    </div>
                    {person.last_recognition && (
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-3 text-slate-400" />
                        <span className="text-slate-600">Último reconhecimento:</span>
                        <span className="ml-2 text-slate-900">
                          {formatDate(person.last_recognition).date} às {formatDate(person.last_recognition).time}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <Activity className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="text-slate-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(person.status)}`}>
                        {person.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {person.notes && (
                <div className="card-mmtec p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Observações</h3>
                  <p className="text-slate-600 text-sm">{person.notes}</p>
                </div>
              )}

              {/* Últimos Reconhecimentos */}
              <div className="card-mmtec p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Últimos Reconhecimentos</h3>
                <div className="space-y-3">
                  {mockHistory.slice(0, 3).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          record.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{record.location}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(record.timestamp).date} às {formatDate(record.timestamp).time}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(record.confidence)}`}>
                        {(record.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('history')}
                  className="mt-4 text-mmtec-accent hover:text-mmtec-accent-dark text-sm font-medium"
                >
                  Ver histórico completo →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              {person.photos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg text-slate-600 mb-2">Nenhuma foto cadastrada</p>
                  <p className="text-slate-500">Adicione fotos para melhorar o reconhecimento</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Galeria de Fotos ({person.photos.length})
                    </h3>
                    <button className="btn-mmtec-outline">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Todas
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {person.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img
                          src={photo}
                          alt={`${person.name} - Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Filtros do Histórico */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por local ou câmera..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="input-mmtec pl-10 w-64"
                    />
                  </div>
                  
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="input-mmtec"
                  >
                    <option value="all">Todos</option>
                    <option value="success">Sucessos</option>
                    <option value="failed">Falhas</option>
                  </select>
                </div>

                <div className="text-sm text-slate-600">
                  {filteredHistory.length} de {recognitionHistory.length} registros
                </div>
              </div>

              {/* Lista do Histórico */}
              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="loading-mmtec-lg mx-auto mb-4" />
                  <p className="text-slate-600">Carregando histórico...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg text-slate-600 mb-2">Nenhum reconhecimento encontrado</p>
                  <p className="text-slate-500">
                    {historyFilter !== 'all' || historySearch 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Esta pessoa ainda não foi reconhecida pelo sistema'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((record) => (
                    <div key={record.id} className="card-mmtec p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {record.image_url && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                              <img
                                src={record.image_url}
                                alt="Reconhecimento"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-slate-900">
                                {record.location || 'Local não identificado'}
                              </h4>
                              <span className={`w-2 h-2 rounded-full ${
                                record.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>
                                {formatDate(record.timestamp).date} às {formatDate(record.timestamp).time}
                              </span>
                              {record.camera_id && (
                                <>
                                  <span>•</span>
                                  <span>{record.camera_id}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{record.processing_time}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(record.confidence)}`}>
                            <Target className="h-3 w-3 mr-1 inline" />
                            {(record.confidence * 100).toFixed(1)}%
                          </div>
                          
                          {record.image_url && (
                            <button
                              onClick={() => setSelectedPhoto(record.image_url!)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={selectedPhoto}
              alt="Visualização"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors">
                <Download className="h-4 w-4 mr-2 inline" />
                Baixar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonDetailsModal