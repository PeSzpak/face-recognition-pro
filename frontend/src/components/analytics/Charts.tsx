import React from 'react'
import { CHART_COLORS } from '@/utils/constants'

interface ChartData {
  labels: string[]
  data: number[]
}

interface SimpleChartProps {
  title: string
  data: ChartData
  type?: 'bar' | 'line' | 'pie'
}

const SimpleChart: React.FC<SimpleChartProps> = ({ title, data, type = 'bar' }) => {
  const maxValue = Math.max(...data.data)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="space-y-3">
        {data.labels.map((label, index) => {
          const value = data.data[index]
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
          const color = CHART_COLORS.chart[index % CHART_COLORS.chart.length]

          return (
            <div key={label} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 truncate">{label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-gray-900 text-right">
                {value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SimpleChart