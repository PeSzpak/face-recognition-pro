import React, { useState, useEffect } from 'react';
import { dashboardService } from '@/services/dashboard';
import { DashboardStats as StatsType, DashboardActivity } from '@/types';
import DashboardStats from './DashboardStats';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load stats and activities in parallel
      const [statsData, activitiesData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentActivities(10)
      ]);

      setStats(statsData);
      setActivities(activitiesData);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your face recognition system.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn-secondary"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <DashboardStats stats={stats!} isLoading={isLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} isLoading={isLoading} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;