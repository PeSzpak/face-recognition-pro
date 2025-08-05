import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react'

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-mmtec-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios e Análises</h1>
          <p className="text-slate-600">Acompanhe métricas e estatísticas do sistema</p>
        </div>
        <button className="btn-mmtec-primary">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-4">Reconhecimentos por Dia</h3>
          <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-12 w-12 text-slate-400" />
            <span className="ml-2 text-slate-500">Gráfico em desenvolvimento</span>
          </div>
        </div>

        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-4">Taxa de Sucesso</h3>
          <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-12 w-12 text-slate-400" />
            <span className="ml-2 text-slate-500">Gráfico em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics