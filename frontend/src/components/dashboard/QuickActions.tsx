import React from 'react';
import { Camera, Users, Plus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'New Recognition',
      description: 'Identify a person from photo or camera',
      icon: Camera,
      color: 'bg-blue-500',
      href: '/recognition',
    },
    {
      title: 'Add Person',
      description: 'Register a new person in the system',
      icon: Plus,
      color: 'bg-green-500',
      href: '/people/new',
    },
    {
      title: 'View People',
      description: 'Manage registered people',
      icon: Users,
      color: 'bg-purple-500',
      href: '/people',
    },
    {
      title: 'Analytics',
      description: 'View detailed reports and insights',
      icon: BarChart3,
      color: 'bg-orange-500',
      href: '/analytics',
    },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
      
      <div className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigate(action.href)}
            className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                  {action.title}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;