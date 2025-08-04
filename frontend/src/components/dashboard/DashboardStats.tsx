import React from 'react';
import { Users, Camera, TrendingUp, Database } from 'lucide-react';
import { DashboardStats as StatsType } from '@/types';

interface DashboardStatsProps {
  stats: StatsType;
  isLoading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total People',
      value: stats.total_persons,
      subtitle: `${stats.active_persons} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Recognitions',
      value: stats.total_recognitions,
      subtitle: `${stats.recognitions_today} today`,
      icon: Camera,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Success Rate',
      value: `${stats.accuracy}%`,
      subtitle: `${stats.successful_recognitions} successful`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Database',
      value: stats.vector_database.total_vectors,
      subtitle: `${stats.vector_database.dimension}D vectors`,
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <div key={index} className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {card.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {card.subtitle}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;