import React from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  Eye,
  Camera,
  Calendar,
  Badge
} from 'lucide-react'

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
}

interface PersonCardProps {
  person: Person
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  onView: (person: Person) => void
}

const PersonCard: React.FC<PersonCardProps> = ({ 
  person, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Ativo' : 'Inativo'
  }

  return (
    <div className="card-mmtec p-6 hover:shadow-lg transition-shadow">
      {/* Header com foto principal */}
      <div className="flex items-start space-x-4 mb-4">
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
          
          {person.photos.length > 1 && (
            <div className="absolute -bottom-1 -right-1 bg-mmtec-accent text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              +{person.photos.length - 1}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900 truncate">
              {person.name}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(person.status)}`}>
              {getStatusText(person.status)}
            </span>
          </div>

          {person.position && (
            <p className="text-sm text-slate-600 mb-1">{person.position}</p>
          )}
          
          {person.department && (
            <p className="text-xs text-slate-500 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {person.department}
            </p>
          )}
        </div>
      </div>

      {/* Informações de contato */}
      <div className="space-y-2 mb-4">
        {person.email && (
          <div className="flex items-center text-sm text-slate-600">
            <Mail className="h-4 w-4 mr-2 text-slate-400" />
            <span className="truncate">{person.email}</span>
          </div>
        )}
        
        {person.phone && (
          <div className="flex items-center text-sm text-slate-600">
            <Phone className="h-4 w-4 mr-2 text-slate-400" />
            <span>{person.phone}</span>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{person.photos.length}</div>
          <div className="text-xs text-slate-500">Fotos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-mmtec-accent">{person.recognition_count}</div>
          <div className="text-xs text-slate-500">Reconhecimentos</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-900 font-medium">
            {person.last_recognition 
              ? formatDate(person.last_recognition)
              : 'Nunca'
            }
          </div>
          <div className="text-xs text-slate-500">Último</div>
        </div>
      </div>

      {/* Data de cadastro */}
      <div className="flex items-center text-xs text-slate-500 mb-4">
        <Calendar className="h-3 w-3 mr-1" />
        Cadastrado em {formatDate(person.created_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={() => onView(person)}
          className="text-mmtec-accent hover:text-mmtec-accent-dark text-sm font-medium flex items-center"
        >
          <Eye className="h-4 w-4 mr-1" />
          Ver Detalhes
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(person)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onDelete(person)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonCard