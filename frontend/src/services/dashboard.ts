import { apiService } from './api';
import {
  DashboardStats,
  DashboardActivity,
  AnalyticsData
} from '@/types';
import { API_ENDPOINTS } from '@/utils/constants';

class DashboardService {
  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get<DashboardStats>(
      API_ENDPOINTS.DASHBOARD_STATS
    );

    return response;
  }

  // Get recent activities
  async getRecentActivities(limit: number = 10): Promise<DashboardActivity[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await apiService.get<DashboardActivity[]>(
      `${API_ENDPOINTS.DASHBOARD_RECENT}?${params.toString()}`
    );

    return response;
  }

  // Get analytics data
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await apiService.get<AnalyticsData>(
      API_ENDPOINTS.DASHBOARD_ANALYTICS
    );

    return response;
  }

  // Get system health
  async getSystemHealth(): Promise<any> {
    const response = await apiService.get(API_ENDPOINTS.HEALTH);
    return response;
  }

  // Calculate derived metrics
  calculateDerivedMetrics(stats: DashboardStats) {
    const successRate = stats.total_recognitions > 0 
      ? (stats.successful_recognitions / stats.total_recognitions) * 100 
      : 0;

    const growthRate = stats.recognitions_today > 0 
      ? ((stats.recognitions_today / (stats.total_recognitions || 1)) * 100)
      : 0;

    return {
      ...stats,
      success_rate: Math.round(successRate * 100) / 100,
      daily_growth_rate: Math.round(growthRate * 100) / 100,
      avg_recognitions_per_person: stats.active_persons > 0 
        ? Math.round(stats.total_recognitions / stats.active_persons)
        : 0,
    };
  }

  // Format analytics data for charts
  formatChartData(analytics: AnalyticsData) {
    return {
      dailyRecognitions: {
        labels: analytics.daily_recognitions.map(item => item.date),
        datasets: [{
          label: 'Daily Recognitions',
          data: analytics.daily_recognitions.map(item => item.count),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        }]
      },
      successRateTrend: {
        labels: analytics.success_rate_trend.map(item => item.date),
        datasets: [{
          label: 'Success Rate (%)',
          data: analytics.success_rate_trend.map(item => item.rate),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1,
        }]
      },
      topPersons: {
        labels: analytics.top_recognized_persons.map(item => item.name),
        datasets: [{
          label: 'Recognition Count',
          data: analytics.top_recognized_persons.map(item => item.count),
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
          ],
        }]
      }
    };
  }
}

export const dashboardService = new DashboardService();