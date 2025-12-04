import { DashboardStats, DashboardActivity, AnalyticsData } from '@/types'
import apiService from './api'
import { API_ENDPOINTS } from '@/utils/constants'

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.get(API_ENDPOINTS.DASHBOARD.STATS)
      return response.data
    } catch (error) {
      console.warn('Erro ao buscar estatísticas do backend:', error)
      throw error
    }
  }

  async getRecentActivity(): Promise<DashboardActivity[]> {
    try {
      const response = await apiService.get(API_ENDPOINTS.DASHBOARD.ACTIVITY)
      return response.data.activity || []
    } catch (error) {
      console.warn('Erro ao buscar atividades do backend:', error)
      throw error
    }
  }

  calculateDerivedMetrics(stats: DashboardStats) {
    const successRate = stats.total_recognitions > 0 
      ? (stats.successful_recognitions / stats.total_recognitions) * 100 
      : 0

    return {
      ...stats,
      success_rate: Math.round(successRate * 100) / 100,
      daily_growth_rate: 0,
      avg_recognitions_per_person: stats.active_persons > 0 
        ? Math.round(stats.total_recognitions / stats.active_persons)
        : 0,
    }
  }
}

export const dashboardService = new DashboardService()