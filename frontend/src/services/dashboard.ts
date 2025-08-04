import { DashboardStats, DashboardActivity, AnalyticsData } from '@/types'

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    try {
      // Simular tentativa de API real (substituir quando backend estiver pronto)
      console.log('Tentando buscar dados do backend...')
      
      // Por enquanto, retornar dados mock
      return this.getMockStats()
    } catch (error) {
      console.warn('Backend não disponível, usando dados mock')
      return this.getMockStats()
    }
  }

  async getRecentActivity(): Promise<DashboardActivity[]> {
    try {
      console.log('Tentando buscar atividades do backend...')
      return this.getMockActivity()
    } catch (error) {
      return this.getMockActivity()
    }
  }

  private getMockStats(): DashboardStats {
    return {
      total_persons: 15,
      active_persons: 12,
      total_recognitions: 456,
      recognitions_today: 23,
      successful_recognitions: 398,
      accuracy: 87.3,
      vector_database: {
        total_vectors: 180,
        dimension: 512
      }
    }
  }

  private getMockActivity(): DashboardActivity[] {
    const now = new Date()
    
    return [
      {
        id: '1',
        type: 'recognition_success',
        person_name: 'João Silva',
        confidence: 0.94,
        details: 'Reconhecimento bem-sucedido com alta confiança',
        timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'person_added',
        person_name: 'Maria Santos',
        details: 'Nova pessoa adicionada ao sistema',
        timestamp: new Date(now.getTime() - 8 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'recognition_failed',
        details: 'Face não reconhecida - confiança muito baixa',
        confidence: 0.35,
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'recognition_success',
        person_name: 'Carlos Oliveira',
        confidence: 0.89,
        details: 'Reconhecimento realizado com sucesso',
        timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        type: 'system_event',
        details: 'Sistema de reconhecimento iniciado',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  calculateDerivedMetrics(stats: DashboardStats) {
    const successRate = stats.total_recognitions > 0 
      ? (stats.successful_recognitions / stats.total_recognitions) * 100 
      : 0

    return {
      ...stats,
      success_rate: Math.round(successRate * 100) / 100,
      daily_growth_rate: 15.2, // Mock value
      avg_recognitions_per_person: stats.active_persons > 0 
        ? Math.round(stats.total_recognitions / stats.active_persons)
        : 0,
    }
  }
}

export const dashboardService = new DashboardService()