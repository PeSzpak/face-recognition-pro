import React, { useState, useRef } from 'react'
import { 
  User, 
  Upload, 
  Camera, 
  X, 
  Save, 
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PersonFormData {
  name: string
  email: string
  department: string
  position: string
  phone: string
  notes: string
  photos: File[]
  status: 'active' | 'inactive'
}

interface PersonFormProps {
  person?: any
  onSubmit: (data: PersonFormData) => void
  onCancel: () => void
  loading?: boolean
}

const PersonForm: React.FC<PersonFormProps> = ({ 
  person, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<PersonFormData>({
    name: person?.name || '',
    email: person?.email || '',
    department: person?.department || '',
    position: person?.position || '',
    phone: person?.phone || '',
    notes: person?.notes || '',
    photos: [],
    status: person?.status || 'active'
  })

  const [photoPreview, setPhotoPreview] = useState<string[]>(
    person?.photos || []
  )

  const [dragActive, setDragActive] = useState(false)

  const handleInputChange = (field: keyof PersonFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 5MB)`)
        return false
      }
      return true
    })

    if (formData.photos.length + validFiles.length > 10) {
      toast.error('Máximo 10 fotos por pessoa')
      return
    }

    // Adicionar fotos aos dados do formulário
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }))

    // Criar previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    toast.success(`${validFiles.length} foto(s) adicionada(s)`)
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
    setPhotoPreview(prev => prev.filter((_, i) => i !== index))
    toast.success('Foto removida')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handlePhotoUpload(e.dataTransfer.files)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    
    if (formData.photos.length === 0 && !person) {
      toast.error('Adicione pelo menos uma foto')
      return
    }

    onSubmit(formData)
  }

  const isEditing = !!person

  return (
    <div className="card-mmtec max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-mmtec-gradient rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditing ? 'Editar Pessoa' : 'Nova Pessoa'}
              </h2>
              <p className="text-slate-600">
                {isEditing ? 'Atualize as informações da pessoa' : 'Cadastre uma nova pessoa no sistema'}
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Informações Básicas */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Informações Básicas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="input-mmtec"
                placeholder="Ex: João Silva Santos"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input-mmtec"
                placeholder="joao@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Departamento
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="input-mmtec"
              >
                <option value="">Selecione um departamento</option>
                <option value="Desenvolvimento">Desenvolvimento</option>
                <option value="Marketing">Marketing</option>
                <option value="Vendas">Vendas</option>
                <option value="RH">Recursos Humanos</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Operações">Operações</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cargo
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="input-mmtec"
                placeholder="Ex: Desenvolvedor Sênior"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="input-mmtec"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive')}
                className="input-mmtec"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="input-mmtec"
              rows={3}
              placeholder="Informações adicionais sobre a pessoa..."
            />
          </div>
        </div>

        {/* Upload de Fotos */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Fotos para Reconhecimento
            {!isEditing && <span className="text-red-500 ml-1">*</span>}
          </h3>
          
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-mmtec-accent bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <h4 className="text-lg font-medium text-slate-700 mb-2">
                Adicionar Fotos
              </h4>
              <p className="text-slate-500 mb-4">
                Arraste fotos aqui ou clique para selecionar
              </p>
              
              <div className="text-sm text-slate-400 space-y-1 mb-6">
                <p>• Formatos: JPG, PNG, WebP</p>
                <p>• Tamanho máximo: 5MB por foto</p>
                <p>• Máximo: 10 fotos por pessoa</p>
                <p>• Recomendado: Diferentes ângulos e expressões</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-mmtec-outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Fotos
              </button>
            </div>

            {/* Preview das Fotos */}
            {photoPreview.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-700 mb-3">
                  Fotos Selecionadas ({photoPreview.length}/10)
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photoPreview.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Abrir modal de preview (implementar depois)
                            }}
                            className="p-2 bg-white rounded-full text-slate-600 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="p-2 bg-white rounded-full text-slate-600 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <AlertCircle className="h-4 w-4" />
            <span>* Campos obrigatórios</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn-mmtec-outline"
              disabled={loading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="btn-mmtec-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-mmtec mr-2" />
                  {isEditing ? 'Atualizando...' : 'Cadastrando...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Atualizar Pessoa' : 'Cadastrar Pessoa'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default PersonForm