import React from 'react';
import { Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { DashboardActivity } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  activities: DashboardActivity[];
  isLoading?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'recognition_success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'recognition_failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'recognition_success':
        return 'bg-green-100';
      case 'recognition_failed':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {activity.person_name ? (
                    <>
                      <span className="font-medium">{activity.person_name}</span>
                      {activity.confidence && (
                        <span className="text-gray-500">
                          {' '}({(activity.confidence * 100).toFixed(1)}% confidence)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500">Unknown person</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.details}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;