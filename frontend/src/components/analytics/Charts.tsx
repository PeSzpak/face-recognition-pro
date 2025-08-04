import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { AnalyticsData } from '@/types';
import { CHART_COLORS } from '@/utils/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChartsProps {
  analytics: AnalyticsData;
}

const Charts: React.FC<ChartsProps> = ({ analytics }) => {
  // Daily Recognitions Chart
  const dailyRecognitionsData = {
    labels: analytics.daily_recognitions.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Daily Recognitions',
        data: analytics.daily_recognitions.map(item => item.count),
        borderColor: CHART_COLORS.PRIMARY,
        backgroundColor: `${CHART_COLORS.PRIMARY}20`,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  // Success Rate Trend Chart
  const successRateData = {
    labels: analytics.success_rate_trend.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Success Rate (%)',
        data: analytics.success_rate_trend.map(item => item.rate),
        borderColor: CHART_COLORS.SUCCESS,
        backgroundColor: `${CHART_COLORS.SUCCESS}20`,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  // Top Recognized Persons Chart
  const topPersonsData = {
    labels: analytics.top_recognized_persons.map(item => item.name),
    datasets: [
      {
        label: 'Recognition Count',
        data: analytics.top_recognized_persons.map(item => item.count),
        backgroundColor: CHART_COLORS.GRADIENT.slice(0, analytics.top_recognized_persons.length),
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
        },
      },
      x: {
        grid: {
          color: '#f3f4f6',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Daily Recognitions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Recognition Activity
        </h3>
        <div className="h-64">
          <Line data={dailyRecognitionsData} options={chartOptions} />
        </div>
      </div>

      {/* Success Rate and Top Persons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Success Rate Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Success Rate Trend
          </h3>
          <div className="h-64">
            <Line data={successRateData} options={chartOptions} />
          </div>
        </div>

        {/* Top Recognized Persons */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Most Recognized People
          </h3>
          <div className="h-64">
            <Doughnut data={topPersonsData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-600">
              {analytics.performance_metrics.avg_processing_time.toFixed(2)}s
            </p>
            <p className="text-sm text-gray-600">Average Processing Time</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {analytics.performance_metrics.peak_hour}
            </p>
            <p className="text-sm text-gray-600">Peak Activity Hour</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {analytics.performance_metrics.total_embeddings.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Total Face Embeddings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;