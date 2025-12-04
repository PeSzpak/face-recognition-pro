import React from 'react'

interface ChartsProps {
  type: 'bar' | 'line'
  data: Array<Record<string, any>>
  xKey: string
  yKey: string
  color: string
}

const Charts: React.FC<ChartsProps> = ({ type, data, xKey, yKey, color }) => {
  // Calculate max value for scaling
  const values = data.map(item => Number(item[yKey]) || 0)
  const maxValue = Math.max(...values, 1)

  return (
    <div className="h-64 flex flex-col">
      {type === 'bar' ? (
        <div className="flex-1 flex items-end justify-between gap-2">
          {data.map((item, index) => {
            const value = Number(item[yKey]) || 0
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                  <div
                    className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer relative group"
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      minHeight: value > 0 ? '4px' : '0'
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {value}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-2 truncate w-full text-center">
                  {String(item[xKey]).split('-').slice(1).join('/')}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1="0"
                y1={200 - (percent * 2)}
                x2="800"
                y2={200 - (percent * 2)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            ))}
            
            {/* Line path */}
            <polyline
              points={data.map((item, index) => {
                const x = (index / (data.length - 1)) * 800
                const value = Number(item[yKey]) || 0
                const y = 200 - ((value / maxValue) * 180)
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Area under line */}
            <polygon
              points={`0,200 ${data.map((item, index) => {
                const x = (index / (data.length - 1)) * 800
                const value = Number(item[yKey]) || 0
                const y = 200 - ((value / maxValue) * 180)
                return `${x},${y}`
              }).join(' ')} 800,200`}
              fill={color}
              fillOpacity="0.1"
            />
            
            {/* Data points */}
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 800
              const value = Number(item[yKey]) || 0
              const y = 200 - ((value / maxValue) * 180)
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color}
                  className="cursor-pointer hover:r-6 transition-all"
                >
                  <title>{`${item[xKey]}: ${value}`}</title>
                </circle>
              )
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 px-1">
            {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((item, index) => (
              <div key={index} className="text-xs text-slate-600">
                {String(item[xKey]).split('-').slice(1).join('/')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Charts