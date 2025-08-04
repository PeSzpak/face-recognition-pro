import React, { useState, useEffect } from 'react'
import { Users, Camera, TrendingUp, Database, Clock, CheckCircle } from 'lucide-react'
import StatsCard from './StatsCard'
import RecentActivity from './RecentActivity'
import QuickActions from './QuickActions'

interface DashboardStats {
  total_persons: number
  active_persons: number
  total_recognitions: number
  recognitions_today: number
  successful_recognitions: number
  accuracy: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_persons: 0,
    active_persons: 0,
    total_recognitions: 0,
    recognitions_today: 0,
    successful_recognitions: 0,
    accuracy: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de dados (substituir por chamada real da API)
    const loadStats = async () => {
      try {
        // Dados simulados para demonstração
        setTimeout(() => {
          setStats({
            total_persons: 45,
            active_persons: 42,
            total_recognitions: 1284,
            recognitions_today: 23,
            successful_recognitions: 1156,
            accuracy: 92.5,
          })
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statsData = [
    {
      title: 'Total People',
      value: stats.total_persons.toString(),
      subtitle: `${stats.active_persons} active`,
      icon: Users,
      color: 'blue' as const,
      trend: '+12%'
    },
    {
      title: 'Today\'s Recognition',
      value: stats.recognitions_today.toString(),
      subtitle: 'recognition attempts',
      icon: Camera,
      color: 'green' as const,
      trend: '+8%'
    },
    {
      title: 'Success Rate',
      value: `${stats.accuracy}%`,
      subtitle: 'accuracy rate',
      icon: CheckCircle,
      color: 'purple' as const,
      trend: '+2.5%'
    },
    {
      title: 'Total Recognition',
      value: stats.total_recognitions.toString(),
      subtitle: 'all time',
      icon: TrendingUp,
      color: 'orange' as const,
      trend: '+15%'
    }
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your face recognition system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
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