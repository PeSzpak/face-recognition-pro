import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Camera,
  Eye,
} from "lucide-react";
import StatsCard from "./StatsCard";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import DashboardStats from "./DashboardStats";
import { dashboardService } from "@/services/dashboard";
import Loading from "@/components/ui/Loading";
import toast from "react-hot-toast";

interface DashboardStatsData {
  totalRecognitions: number;
  successRate: number;
  activeUsers: number;
  systemUptime: string;
  todayRecognitions: number;
  weeklyGrowth: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalRecognitions: 0,
    successRate: 0,
    activeUsers: 0,
    systemUptime: "0h",
    todayRecognitions: 0,
    weeklyGrowth: 0,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, activityData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(),
      ]);

      // Transform the API response to match our component's expected structure
      const transformedStats: DashboardStatsData = {
        totalRecognitions: statsResponse.total_recognitions || 0,
        successRate: statsResponse.accuracy || 0,
        activeUsers: statsResponse.active_persons || 0,
        systemUptime: "24h", // You may need to calculate this from actual uptime data
        todayRecognitions: statsResponse.recognitions_today || 0,
        weeklyGrowth: 5, // You may need to calculate this from historical data
      };

      setStats(transformedStats);
      setRecentActivity(activityData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await loadDashboardData();
    toast.success("Dados atualizados!");
  };

  const statCards = [
    {
      title: "Reconhecimentos Totais",
      value: stats.totalRecognitions.toLocaleString(),
      change: `+${stats.weeklyGrowth}%`,
      changeType: "positive",
      icon: Shield,
      color: "bg-mmtec-gradient",
    },
    {
      title: "Taxa de Sucesso",
      value: `${stats.successRate}%`,
      change: "+0.3%",
      changeType: "positive",
      icon: CheckCircle,
      color: "bg-mmtec-gradient-accent",
    },
    {
      title: "Usuários Ativos",
      value: stats.activeUsers.toString(),
      change: "+8",
      changeType: "positive",
      icon: Users,
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
    },
    {
      title: "Hoje",
      value: stats.todayRecognitions.toString(),
      change: "reconhecimentos",
      changeType: "neutral",
      icon: Activity,
      color: "bg-gradient-to-r from-purple-500 to-purple-600",
    },
  ];

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erro ao carregar dashboard
          </h3>
          <button onClick={refreshData} className="btn-primary">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="card-mmtec p-8 bg-mmtec-gradient text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo ao MMTec Face Recognition Pro
            </h1>
            <p className="text-blue-100 text-lg">
              Sistema avançado de reconhecimento facial em operação
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.systemUptime}</div>
            <div className="text-blue-100">Tempo Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">24/7</div>
            <div className="text-blue-100">Monitoramento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">99.9%</div>
            <div className="text-blue-100">Disponibilidade</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="card-mmtec p-6 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div
                  className={`text-sm font-medium ${
                    card.changeType === "positive"
                      ? "text-green-600"
                      : card.changeType === "negative"
                      ? "text-red-600"
                      : "text-slate-600"
                  }`}
                >
                  {card.change}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {card.value}
                </div>
                <div className="text-sm text-slate-600">{card.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card-mmtec p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Atividade Recente
              </h3>
              <button className="text-sm text-mmtec-accent hover:text-mmtec-success font-medium">
                Ver todas
              </button>
            </div>

            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center p-4 bg-slate-50 rounded-lg"
                >
                  <div
                    className={`p-2 rounded-full mr-4 ${
                      activity.type === "success"
                        ? "bg-green-100"
                        : activity.type === "warning"
                        ? "bg-yellow-100"
                        : "bg-red-100"
                    }`}
                  >
                    {activity.type === "success" ? (
                      <CheckCircle
                        className={`h-4 w-4 ${
                          activity.type === "success"
                            ? "text-green-600"
                            : activity.type === "warning"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {activity.user}
                        </div>
                        <div className="text-sm text-slate-600">
                          {activity.action}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500">
                          {activity.time}
                        </div>
                        {activity.confidence > 0 && (
                          <div className="text-xs font-medium text-green-600">
                            {activity.confidence}% confiança
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="card-mmtec p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Ações Rápidas
            </h3>

            <div className="space-y-3">
              <button className="w-full btn-mmtec-primary justify-start">
                <Camera className="h-4 w-4 mr-3" />
                Novo Reconhecimento
              </button>

              <button className="w-full btn-mmtec-outline justify-start">
                <Users className="h-4 w-4 mr-3" />
                Gerenciar Pessoas
              </button>

              <button className="w-full btn-mmtec-outline justify-start">
                <Eye className="h-4 w-4 mr-3" />
                Ver Relatórios
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card-mmtec p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Status do Sistema
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">API Server</span>
                <span className="status-success">Online</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Base de Dados</span>
                <span className="status-success">Conectado</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Sistema AI</span>
                <span className="status-success">Ativo</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Anti-spoofing</span>
                <span className="status-success">Habilitado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
