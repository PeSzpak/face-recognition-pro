import React, { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { personsService } from '@/services/persons'
import { Person } from '@/types'
import PersonForm from './PersonForm'
import PersonDetails from './PersonDetails'

const People: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadPeople = async () => {
    try {
      setLoading(true)
      const response = await personsService.getPersons(currentPage, 20, searchTerm || undefined)
      setPeople(response.persons || [])
      setTotalPages(Math.ceil((response.total || 0) / 20))
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error)
      toast.error('Erro ao carregar lista de pessoas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeople()
  }, [currentPage, searchTerm])

  const handleCreatePerson = async (data: { name: string; description: string }) => {
    try {
      await personsService.createPerson(data)
      toast.success('Pessoa criada com sucesso!')
      setShowForm(false)
      loadPeople()
    } catch (error: any) {
      console.error('Erro ao criar pessoa:', error)
      toast.error(error.response?.data?.detail || 'Erro ao criar pessoa')
    }
  }

  const handleEditPerson = async (id: string, data: { name?: string; description?: string; active?: boolean }) => {
    try {
      await personsService.updatePerson(id, data)
      toast.success('Pessoa atualizada com sucesso!')
      setShowDetails(false)
      setSelectedPerson(null)
      loadPeople()
    } catch (error: any) {
      console.error('Erro ao atualizar pessoa:', error)
      toast.error(error.response?.data?.detail || 'Erro ao atualizar pessoa')
    }
  }

  const handleDeletePerson = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar ${name}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      await personsService.deletePerson(id)
      toast.success('Pessoa deletada com sucesso!')
      loadPeople()
    } catch (error: any) {
      console.error('Erro ao deletar pessoa:', error)
      toast.error(error.response?.data?.detail || 'Erro ao deletar pessoa')
    }
  }

  const handleViewDetails = (person: Person) => {
    setSelectedPerson(person)
    setShowDetails(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-mmtec-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciar Pessoas</h1>
          <p className="text-slate-600">Cadastre e gerencie pessoas no sistema de reconhecimento</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-mmtec-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Pessoa
        </button>
      </div>

      {/* Search */}
      <div className="card-mmtec p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pessoas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-mmtec pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{people.length}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </div>
        </div>
        
        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {people.filter(p => p.active).length}
              </div>
              <div className="text-sm text-slate-600">Ativos</div>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Edit className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {people.reduce((acc, p) => acc + p.photo_count, 0)}
              </div>
              <div className="text-sm text-slate-600">Fotos</div>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {people.filter(p => !p.active).length}
              </div>
              <div className="text-sm text-slate-600">Inativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="card-mmtec p-6">
        <div className="space-y-4">
          {people.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma pessoa cadastrada</p>
              <button 
                onClick={() => setShowForm(true)}
                className="btn-mmtec-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeira Pessoa
              </button>
            </div>
          ) : (
            people.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div 
                  className="flex items-center space-x-4 flex-1 cursor-pointer"
                  onClick={() => handleViewDetails(person)}
                >
                  <div className="w-12 h-12 bg-mmtec-gradient rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{person.name}</h3>
                    <p className="text-sm text-slate-600">{person.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`status-${person.active ? 'success' : 'error'}`}>
                        {person.active ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {person.photo_count} fotos
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDetails(person)
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePerson(person.id, person.name)
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <PersonForm
          onCancel={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false)
            loadPeople()
          }}
        />
      )}

      {showDetails && selectedPerson && (
        <PersonDetails
          person={selectedPerson}
          onEdit={() => {
            setShowDetails(false)
            setShowForm(true)
          }}
          onClose={() => {
            setShowDetails(false)
            setSelectedPerson(null)
            loadPeople()
          }}
        />
      )}
    </div>
  )
}

export default People