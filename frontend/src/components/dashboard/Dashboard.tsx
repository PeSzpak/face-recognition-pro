import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Users, 
  Clock, 
  TrendingUp, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Camera,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DashboardStats {
  totalRecognitions: number
  successRate: number
  activeUsers: number
  systemUptime: string
  todayRecognitions: number
  weeklyGrowth: number
  averageConfidence: number
  spoofingAttempts: number
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalRecognitions: 0,
    successRate: 0,
    activeUsers: 0,
    systemUptime: '0h',
    todayRecognitions: 0,
    weeklyGrowth: 0,
    averageConfidence: 0,
    spoofingAttempts: 0
  })
  
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Load dashboard data
    const loadDashboardData = () => {
      setTimeout(() => {
        setStats({
          totalRecognitions: 15247,
          successRate: 97.8,
          activeUsers: 187,
          systemUptime: '28d 14h 32m',
          todayRecognitions: 143,
          weeklyGrowth: 18.5,
          averageConfidence: 94.2,
          spoofingAttempts: 3
        })

        setRecentActivity([
          {
            id: 1,
            type: 'success',
            user: 'João Silva',
            action: 'Acesso autorizado - Entrada principal',
            time: '1 min atrás',
            confidence: 97.2,
            location: 'Portaria A'
          },
          {
            id: 2,
            type: 'success',
            user: 'Maria Santos',
            action: 'Acesso autorizado - Laboratório',
            time: '3 min atrás',
            confidence: 95.8,
            location: 'Lab 01'
          },
          {
            id: 3,
            type: 'warning',
            user: 'Tentativa de spoofing',
            action: 'Acesso negado - Foto detectada',
            time: '8 min atrás',
            confidence: 0,
            location: 'Portaria B'
          },
          {
            id: 4,
            type: 'success',
            user: 'Pedro Costa',
            action: 'Acesso autorizado - Sala de reuniões',
            time: '12 min atrás',
            confidence: 96.1,
            location: 'Sala 201'
          },
          {
            id: 5,
            type: 'error',
            user: 'Usuário desconhecido',
            action: 'Acesso negado - Pessoa não cadastrada',
            time: '15 min atrás',
            confidence: 0,
            location: 'Portaria A'
          }
        ])

        setLoading(false)
      }, 1000)
    }

    loadDashboardData()

    return () => clearInterval(timer)
  }, [])

  const statCards = [
    {
      title: 'Reconhecimentos Hoje',
      value: stats.todayRecognitions.toString(),
      change: `+${stats.weeklyGrowth}%`,
      changeType: 'positive',
      icon: Shield,
      color: 'bg-mmtec-gradient',
      description: 'desde ontem'
    },
    {
      title: 'Taxa de Sucesso',
      value: `${stats.successRate}%`,
      change: '+0.5%',
      changeType: 'positive',
      icon: CheckCircle,
      color: 'bg-mmtec-gradient-accent',
      description: 'última semana'
    },
    {
      title: 'Pessoas Cadastradas',
      value: stats.activeUsers.toString(),
      change: '+12',
      changeType: 'positive',
      icon: Users,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      description: 'este mês'
    },
    {
      title: 'Confiança Média',
      value: `${stats.averageConfidence}%`,
      change: '+1.2%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      description: 'últimos 30 dias'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-mmtec-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="card-mmtec-gradient p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Sistema MMTec Face Recognition Pro
            </h1>
            <p className="text-blue-100 text-lg mb-4">
              Monitoramento em tempo real - Sistema operacional
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {currentTime.toLocaleString('pt-BR')}
              </div>
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Uptime: {stats.systemUptime}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalRecognitions.toLocaleString()}</div>
            <div className="text-blue-100">Total de Reconhecimentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">99.9%</div>
            <div className="text-blue-100">Disponibilidade</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">24/7</div>
            <div className="text-blue-100">Monitoramento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.spoofingAttempts}</div>
            <div className="text-blue-100">Tentativas Bloqueadas</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="card-mmtec p-6 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className={`text-sm font-medium ${
                  card.changeType === 'positive' ? 'text-green-600' : 
                  card.changeType === 'negative' ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {card.change}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {card.value}
                </div>
                <div className="text-sm text-slate-600">
                  {card.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {card.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="card-mmtec p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Atividade em Tempo Real
              </h3>
              <button 
                onClick={() => navigate('/analytics')}
                className="text-sm text-mmtec-accent hover:text-mmtec-success font-medium"
              >
                Ver relatório completo
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mmtec-scrollbar">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start p-4 bg-slate-50 rounded-lg">
                  <div className={`p-2 rounded-full mr-4 mt-1 ${
                    activity.type === 'success' ? 'bg-green-100' :
                    activity.type === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {activity.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : activity.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {activity.user}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {activity.action}
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-slate-500">
                            📍 {activity.location}
                          </span>
                          <span className="text-xs text-slate-500">
                            🕒 {activity.time}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.confidence > 0 && (
                          <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {activity.confidence}% confiança
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & System Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card-mmtec p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Ações Rápidas
            </h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/recognition')}
                className="w-full btn-mmtec-primary justify-start"
              >
                <Camera className="h-4 w-4 mr-3" />
                Novo Reconhecimento
              </button>
              
              <button 
                onClick={() => navigate('/people')}
                className="w-full btn-mmtec-outline justify-start"
              >
                <Users className="h-4 w-4 mr-3" />
                Gerenciar Pessoas
              </button>
              
              <button 
                onClick={() => navigate('/analytics')}
                className="w-full btn-mmtec-outline justify-start"
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                Ver Relatórios
              </button>

              <button 
                onClick={() => navigate('/settings')}
                className="w-full btn-mmtec-outline justify-start"
              >
                <Eye className="h-4 w-4 mr-3" />
                Configurações
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card-mmtec p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Status do Sistema
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">API Server</span>
                <span className="status-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></div>
                  Online
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Base de Dados</span>
                <span className="status-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></div>
                  Conectado
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Sistema IA</span>
                <span className="status-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></div>
                  Processando
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Anti-spoofing</span>
                <span className="status-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></div>
                  Ativo
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Câmeras</span>
                <span className="status-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></div>
                  4/4 Online
                </span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Performance</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>CPU</span>
                    <span>23%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-mmtec-accent h-2 rounded-full" style={{ width: '23%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Memória</span>
                    <span>67%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Armazenamento</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard