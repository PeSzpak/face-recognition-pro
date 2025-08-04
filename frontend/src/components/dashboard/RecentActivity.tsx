import React from 'react'
import { Clock, User, Camera, AlertCircle, RefreshCw } from 'lucide-react'
import { DashboardActivity } from '@/types'

interface RecentActivityProps {
  activities?: DashboardActivity[]
  onRefresh?: () => Promise<void>
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  activities = [], 
  onRefresh 
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'recognition_success':
        return <Camera className="h-4 w-4 text-green-500" />
      case 'recognition_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'person_added':
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'recognition_success':
        return 'bg-green-50 border-green-200'
      case 'recognition_failed':
        return 'bg-red-50 border-red-200'
      case 'person_added':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora mesmo'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return `${Math.floor(diffInMinutes / 1440)}d atrás`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Atualizar atividades"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma atividade recente</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.person_name && (
                      <span className="text-blue-600">{activity.person_name}</span>
                    )}
                    {activity.type === 'recognition_success' && ' foi reconhecido'}
                    {activity.type === 'recognition_failed' && 'Reconhecimento falhou'}
                    {activity.type === 'person_added' && ' foi adicionado ao sistema'}
                    {activity.type === 'system_event' && activity.details}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 mt-1">
                  {activity.details}
                </p>
                
                {activity.confidence && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Confiança:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            activity.confidence > 0.8 
                              ? 'bg-green-500' 
                              : activity.confidence > 0.6 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${activity.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {(activity.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Ver todas as atividades
          </button>
        </div>
      )}
    </div>
  )
}

export default RecentActivity