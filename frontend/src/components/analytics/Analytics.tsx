import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar, Download, Users, Activity } from 'lucide-react'
import { analyticsService } from '@/services/analytics'
import toast from 'react-hot-toast'
import Charts from './Charts'

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadAnalytics()
  }, [days])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getOverview(days)
      setOverview(data)
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
      toast.error('Erro ao carregar dados de análise')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    analyticsService.exportReport('csv')
    toast.success('Exportação iniciada!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-mmtec-lg"></div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-600">Sem dados para exibir</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios e Análises</h1>
          <p className="text-slate-600">Acompanhe métricas e estatísticas do sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input-mmtec"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button onClick={handleExport} className="btn-mmtec-primary">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {overview.performance_metrics.avg_processing_time.toFixed(2)}s
              </div>
              <div className="text-sm text-slate-600">Tempo Médio</div>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {overview.performance_metrics.peak_hour}
              </div>
              <div className="text-sm text-slate-600">Horário de Pico</div>
            </div>
          </div>
        </div>

        <div className="card-mmtec p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {overview.performance_metrics.total_embeddings}
              </div>
              <div className="text-sm text-slate-600">Total de Embeddings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Recognitions Chart */}
        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Reconhecimentos por Dia
          </h3>
          {overview.daily_recognitions.length > 0 ? (
            <Charts
              type="bar"
              data={overview.daily_recognitions}
              xKey="date"
              yKey="count"
              color="#3b82f6"
            />
          ) : (
            <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
              <p className="text-slate-500">Sem dados disponíveis</p>
            </div>
          )}
        </div>

        {/* Success Rate Trend Chart */}
        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Taxa de Sucesso
          </h3>
          {overview.success_rate_trend.length > 0 ? (
            <Charts
              type="line"
              data={overview.success_rate_trend}
              xKey="date"
              yKey="rate"
              color="#10b981"
            />
          ) : (
            <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
              <p className="text-slate-500">Sem dados disponíveis</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Recognized Persons */}
      <div className="card-mmtec p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Pessoas Mais Reconhecidas
        </h3>
        {overview.top_recognized_persons.length > 0 ? (
          <div className="space-y-3">
            {overview.top_recognized_persons.map((person: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-mmtec-gradient rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-900">{person.name}</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{person.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Nenhum reconhecimento registrado ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics
