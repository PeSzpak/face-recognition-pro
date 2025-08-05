import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Users,
  Download,
  Grid,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react";
import PersonCard from "./PersonCard";
import PersonForm from "./PersonForm";
import PersonDetailsModal from "./PersonDetailsModal";
import toast from "react-hot-toast";

interface Person {
  id: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  phone?: string;
  photos: string[];
  status: "active" | "inactive";
  created_at: string;
  last_recognition?: string;
  recognition_count: number;
}

const PersonsList: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "name" | "created_at" | "recognition_count"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Mock data para desenvolvimento
  const mockPersons: Person[] = [
    {
      id: "1",
      name: "João Silva Santos",
      email: "joao@empresa.com",
      department: "Desenvolvimento",
      position: "Desenvolvedor Sênior",
      phone: "(11) 99999-9999",
      photos: ["/api/placeholder/400/400", "/api/placeholder/400/401"],
      status: "active",
      created_at: "2024-01-15T10:00:00Z",
      last_recognition: "2024-08-05T14:30:00Z",
      recognition_count: 45,
    },
    {
      id: "2",
      name: "Maria Santos Costa",
      email: "maria@empresa.com",
      department: "Marketing",
      position: "Gerente de Marketing",
      phone: "(11) 88888-8888",
      photos: ["/api/placeholder/400/402"],
      status: "active",
      created_at: "2024-02-20T09:15:00Z",
      last_recognition: "2024-08-05T11:20:00Z",
      recognition_count: 32,
    },
    {
      id: "3",
      name: "Pedro Costa Lima",
      email: "pedro@empresa.com",
      department: "Vendas",
      position: "Vendedor",
      phone: "(11) 77777-7777",
      photos: [
        "/api/placeholder/400/403",
        "/api/placeholder/400/404",
        "/api/placeholder/400/405",
      ],
      status: "inactive",
      created_at: "2024-03-10T16:45:00Z",
      last_recognition: "2024-07-28T09:10:00Z",
      recognition_count: 18,
    },
  ];

  // Carregar dados
  useEffect(() => {
    const loadPersons = async () => {
      setLoading(true);
      try {
        // Simular carregamento
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setPersons(mockPersons);
        setFilteredPersons(mockPersons);
      } catch (error) {
        toast.error("Erro ao carregar pessoas");
      } finally {
        setLoading(false);
      }
    };

    loadPersons();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...persons];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (person) =>
          person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((person) => person.status === statusFilter);
    }

    // Filtro de departamento
    if (departmentFilter !== "all") {
      filtered = filtered.filter(
        (person) => person.department === departmentFilter
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "recognition_count":
          aValue = a.recognition_count;
          bValue = b.recognition_count;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPersons(filtered);
  }, [persons, searchTerm, statusFilter, departmentFilter, sortBy, sortOrder]);

  // Handlers
  const handleAddPerson = () => {
    setEditingPerson(null);
    setShowForm(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setShowForm(true);
  };

  const handleDeletePerson = async (person: Person) => {
    if (window.confirm(`Tem certeza que deseja excluir ${person.name}?`)) {
      try {
        setPersons((prev) => prev.filter((p) => p.id !== person.id));
        toast.success("Pessoa excluída com sucesso");
      } catch (error) {
        toast.error("Erro ao excluir pessoa");
      }
    }
  };

  const handleViewPerson = (person: Person) => {
    setViewingPerson(person);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingPerson) {
        // Atualizar pessoa existente
        const updatedPerson = {
          ...editingPerson,
          ...formData,
          photos:
            formData.photos.length > 0
              ? formData.photos.map((file: File) => URL.createObjectURL(file))
              : editingPerson.photos,
        };
        setPersons((prev) =>
          prev.map((p) => (p.id === editingPerson.id ? updatedPerson : p))
        );
        toast.success("Pessoa atualizada com sucesso");
      } else {
        // Criar nova pessoa
        const newPerson: Person = {
          id: Date.now().toString(),
          ...formData,
          photos: formData.photos.map((file: File) =>
            URL.createObjectURL(file)
          ),
          created_at: new Date().toISOString(),
          recognition_count: 0,
        };
        setPersons((prev) => [newPerson, ...prev]);
        toast.success("Pessoa cadastrada com sucesso");
      }

      setShowForm(false);
      setEditingPerson(null);
    } catch (error) {
      toast.error("Erro ao salvar pessoa");
    }
  };

  const departments = Array.from(
    new Set(persons.map((p) => p.department).filter(Boolean))
  );

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (showForm) {
    return (
      <PersonForm
        person={editingPerson}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingPerson(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pessoas</h1>
          <p className="text-slate-600">
            Gerencie as pessoas cadastradas no sistema de reconhecimento facial
          </p>
        </div>

        <button onClick={handleAddPerson} className="btn-mmtec-primary">
          <Plus className="h-5 w-5 mr-2" />
          Nova Pessoa
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-mmtec p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total de Pessoas</p>
              <p className="text-2xl font-bold text-slate-900">
                {persons.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pessoas Ativas</p>
              <p className="text-2xl font-bold text-slate-900">
                {persons.filter((p) => p.status === "active").length}
              </p>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Departamentos</p>
              <p className="text-2xl font-bold text-slate-900">
                {departments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg mr-4">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Reconhecimentos</p>
              <p className="text-2xl font-bold text-slate-900">
                {persons.reduce((sum, p) => sum + p.recognition_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card-mmtec p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email, cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-mmtec pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-mmtec"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-mmtec"
            >
              <option value="all">Todos os Departamentos</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleSort("name")}
                className={`btn-mmtec-outline flex items-center ${
                  sortBy === "name" ? "bg-blue-50 border-blue-300" : ""
                }`}
              >
                Nome
                {sortBy === "name" &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4 ml-1" />
                  ) : (
                    <SortDesc className="h-4 w-4 ml-1" />
                  ))}
              </button>

              <button
                onClick={() => toggleSort("recognition_count")}
                className={`btn-mmtec-outline flex items-center ${
                  sortBy === "recognition_count"
                    ? "bg-blue-50 border-blue-300"
                    : ""
                }`}
              >
                Reconhecimentos
                {sortBy === "recognition_count" &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4 ml-1" />
                  ) : (
                    <SortDesc className="h-4 w-4 ml-1" />
                  ))}
              </button>
            </div>

            {/* View Mode */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md ${
                  viewMode === "grid" ? "bg-white shadow-sm" : ""
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md ${
                  viewMode === "list" ? "bg-white shadow-sm" : ""
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card-mmtec p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            {filteredPersons.length} pessoa(s) encontrada(s)
          </h3>

          <button className="btn-mmtec-outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="loading-mmtec-lg mx-auto mb-4" />
            <p className="text-slate-600">Carregando pessoas...</p>
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg text-slate-600 mb-2">
              Nenhuma pessoa encontrada
            </p>
            <p className="text-slate-500 mb-6">
              {searchTerm ||
              statusFilter !== "all" ||
              departmentFilter !== "all"
                ? "Tente ajustar os filtros ou adicionar uma nova pessoa"
                : "Comece adicionando a primeira pessoa ao sistema"}
            </p>
            <button onClick={handleAddPerson} className="btn-mmtec-primary">
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Primeira Pessoa
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {filteredPersons.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onEdit={handleEditPerson}
                onDelete={handleDeletePerson}
                onView={handleViewPerson}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {viewingPerson && (
        <PersonDetailsModal
          person={viewingPerson}
          onClose={() => setViewingPerson(null)}
          onEdit={(person) => {
            setViewingPerson(null);
            handleEditPerson(person);
          }}
          onDelete={(person) => {
            setViewingPerson(null);
            handleDeletePerson(person);
          }}
        />
      )}
    </div>
  );
};

export default PersonsList;
