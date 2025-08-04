import React, { useState, useEffect } from 'react'
import { Users, Camera, TrendingUp, Database, Clock, CheckCircle, Activity } from 'lucide-react'
import StatsCard from './StatsCard'
import RecentActivity from './RecentActivity'
import QuickActions from './QuickActions'
import { DashboardStats, DashboardActivity } from '@/types'
import { dashboardService } from '@/services/dashboard'
import Loading from '@/components/ui/Loading'
import toast from 'react-hot-toast'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity()
      ])
      
      setStats(statsData)
      setActivities(activityData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    await loadDashboardData()
    toast.success('Dados atualizados!')
  }

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erro ao carregar dashboard
          </h3>
          <button onClick={refreshData} className="btn-primary">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total de Pessoas',
      value: stats.total_persons.toString(),
      subtitle: `${stats.active_persons} ativas`,
      icon: Users,
      color: 'blue' as const,
      trend: '+12%'
    },
    {
      title: 'Reconhecimentos Hoje',
      value: stats.recognitions_today.toString(),
      subtitle: 'tentativas hoje',
      icon: Camera,
      color: 'green' as const,
      trend: '+8%'
    },
    {
      title: 'Taxa de Sucesso',
      value: `${stats.accuracy.toFixed(1)}%`,
      subtitle: 'precisão média',
      icon: CheckCircle,
      color: 'purple' as const,
      trend: '+2.5%'
    },
    {
      title: 'Total de Reconhecimentos',
      value: stats.total_recognitions.toString(),
      subtitle: 'histórico completo',
      icon: TrendingUp,
      color: 'orange' as const,
      trend: '+15%'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do sistema de reconhecimento facial</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Banco de Vetores</h3>
              <p className="text-sm text-gray-600">
                {stats.vector_database.total_vectors} vetores
              </p>
              <p className="text-xs text-gray-500">
                Dimensão: {stats.vector_database.dimension}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Sistema</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-green-600 font-medium">Online</p>
              </div>
              <p className="text-xs text-gray-500">
                Tempo ativo: 2h 45m
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} onRefresh={refreshData} />
        </div>
        
        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

export default Dashboard