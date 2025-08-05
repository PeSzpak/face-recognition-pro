import React, { useState } from 'react'
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  User
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface MMTecLayoutProps {
  children: React.ReactNode
  currentPage?: string
}

const MMTecLayout: React.FC<MMTecLayoutProps> = ({ children, currentPage = 'dashboard' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: BarChart3, 
      current: currentPage === 'dashboard',
      description: 'Visão geral do sistema'
    },
    { 
      name: 'Reconhecimento', 
      href: '/recognition', 
      icon: Shield, 
      current: currentPage === 'recognition',
      description: 'Face ID e identificação'
    },
    { 
      name: 'Pessoas', 
      href: '/people', 
      icon: Users, 
      current: currentPage === 'people',
      description: 'Gerenciar usuários'
    },
    { 
      name: 'Relatórios', 
      href: '/analytics', 
      icon: BarChart3, 
      current: currentPage === 'analytics',
      description: 'Análises e métricas'
    },
    { 
      name: 'Configurações', 
      href: '/settings', 
      icon: Settings, 
      current: currentPage === 'settings',
      description: 'Configurações do sistema'
    }
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Logout realizado com sucesso!')
    navigate('/login')
  }

  const handleNavigation = (href: string) => {
    navigate(href)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-mmtec-gradient transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-blue-600">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-mmtec-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">MMTec</h1>
                <p className="text-xs text-blue-200">Face Recognition Pro</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-blue-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group
                    ${item.current 
                      ? 'bg-white text-mmtec-primary shadow-lg' 
                      : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${item.current ? 'text-mmtec-primary' : 'text-blue-200 group-hover:text-white'}
                  `} />
                  <div className="text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className={`text-xs ${
                      item.current ? 'text-slate-500' : 'text-blue-200 group-hover:text-blue-100'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-blue-600">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Admin MMTec</p>
                <p className="text-xs text-blue-200">Administrador</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-blue-200 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair do Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl font-semibold text-slate-900 capitalize">
                  {currentPage === 'recognition' ? 'Reconhecimento Facial' : 
                   currentPage === 'people' ? 'Gerenciar Pessoas' :
                   currentPage === 'analytics' ? 'Relatórios e Análises' :
                   currentPage === 'settings' ? 'Configurações' : 'Dashboard'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mmtec-accent focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notifications */}
              <button className="p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded-lg">
                <Bell className="h-5 w-5" />
              </button>

              {/* Status indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="hidden sm:block text-xs font-medium text-slate-600">Sistema Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MMTecLayout