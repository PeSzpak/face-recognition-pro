import React, { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'

const People: React.FC = () => {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setPeople([
        {
          id: '1',
          name: 'João Silva',
          description: 'Funcionário do setor administrativo',
          active: true,
          photo_count: 5,
          created_at: '2024-01-15'
        },
        {
          id: '2',
          name: 'Maria Santos',
          description: 'Gerente de TI',
          active: true,
          photo_count: 3,
          created_at: '2024-01-20'
        },
        {
          id: '3',
          name: 'Pedro Costa',
          description: 'Desenvolvedor',
          active: false,
          photo_count: 2,
          created_at: '2024-02-01'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <button className="btn-mmtec-primary">
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
          {filteredPeople.map((person) => (
            <div key={person.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-4">
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
                <button className="p-2 text-slate-400 hover:text-blue-600">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default People