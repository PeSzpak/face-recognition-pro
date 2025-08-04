import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { dashboardService } from '@/services/dashboard';
import { AnalyticsData, DashboardStats } from '@/types';
import Charts from './Charts';
import Loading from '@/components/ui/Loading';
import toast from 'react-hot-toast';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      const [analyticsData, statsData] = await Promise.all([
        dashboardService.getAnalytics(),
        dashboardService.getDashboardStats()
      ]);

      setAnalytics(analyticsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Detailed insights and performance metrics</p>
          </div>
        </div>
        <div className="flex justify-center py-20">
          <Loading text="Loading analytics..." />
        </div>
      </div>
    );
  }

  if (!analytics || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Detailed insights and performance metrics</p>
          </div>
        </div>
        <div className="card text-center py-20">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Analytics data will appear here once you have recognition activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">
            Detailed insights and performance metrics for your face recognition system
          </p>
        </div>
        
        <button
          onClick={loadAnalyticsData}
          className="btn-secondary"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {stats.accuracy}%
          </p>
          <p className="text-sm text-gray-600">Overall Accuracy</p>
        </div>

        <div className="card text-center">
          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {stats.total_persons}
          </p>
          <p className="text-sm text-gray-600">Registered People</p>
        </div>

        <div className="card text-center">
          <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {stats.total_recognitions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Recognitions</p>
        </div>

        <div className="card text-center">
          <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {analytics.performance_metrics.avg_processing_time.toFixed(2)}s
          </p>
          <p className="text-sm text-gray-600">Avg Processing Time</p>
        </div>
      </div>

      {/* Charts */}
      <Charts analytics={analytics} />
    </div>
  );
};

export default Analytics;