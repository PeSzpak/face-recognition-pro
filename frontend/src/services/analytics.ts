import apiService from './api'
import { API_ENDPOINTS } from '@/utils/constants'

interface DailyRecognition {
  date: string
  count: number
}

interface SuccessRateTrend {
  date: string
  rate: number
}

interface TopPerson {
  name: string
  count: number
}

interface PerformanceMetrics {
  avg_processing_time: number
  peak_hour: string
  total_embeddings: number
}

interface AnalyticsOverview {
  daily_recognitions: DailyRecognition[]
  success_rate_trend: SuccessRateTrend[]
  top_recognized_persons: TopPerson[]
  performance_metrics: PerformanceMetrics
}

interface PersonAnalytics {
  person_name: string
  total_recognitions: number
  successful_recognitions: number
  avg_confidence: number
  last_recognition: string | null
  daily_trend: DailyRecognition[]
}

class AnalyticsService {
  async getOverview(days: number = 7): Promise<AnalyticsOverview> {
    try {
      const response = await apiService.get(`${API_ENDPOINTS.ANALYTICS.OVERVIEW}?days=${days}`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar analytics overview:', error)
      throw error
    }
  }

  async getPersonAnalytics(personId: string, days: number = 30): Promise<PersonAnalytics> {
    try {
      const response = await apiService.get(`/api/analytics/person/${personId}?days=${days}`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar analytics da pessoa:', error)
      throw error
    }
  }

  exportReport(format: 'csv' | 'pdf' = 'csv'): void {
    // TODO: Implement report export
  }
}

export const analyticsService = new AnalyticsService()
