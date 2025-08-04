import React from 'react'
import { Plus, Camera, Users, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const QuickActions: React.FC = () => {
  const navigate = useNavigate()

  const actions = [
    {
      title: 'Add Person',
      description: 'Register a new person',
      icon: Plus,
      color: 'bg-blue-500',
      onClick: () => navigate('/people')
    },
    {
      title: 'Recognize Face',
      description: 'Start recognition process',
      icon: Camera,
      color: 'bg-green-500',
      onClick: () => navigate('/recognition')
    },
    {
      title: 'View People',
      description: 'Manage registered people',
      icon: Users,
      color: 'bg-purple-500',
      onClick: () => navigate('/people')
    },
    {
      title: 'Settings',
      description: 'Configure system',
      icon: Settings,
      color: 'bg-orange-500',
      onClick: () => navigate('/settings')
    }
  ]

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default QuickActions