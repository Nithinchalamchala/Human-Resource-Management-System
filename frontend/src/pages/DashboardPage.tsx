import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, CheckSquare, TrendingUp, Activity, Clock, Award, AlertCircle, ArrowUp } from 'lucide-react';

export function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics');
      return response.data.metrics;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Fetch recent tasks
  const { data: tasksData } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks?limit=5');
      return response.data.tasks || [];
    },
    refetchInterval: 30000,
  });

  // Fetch top performers
  const { data: topPerformers } = useQuery({
    queryKey: ['top-performers'],
    queryFn: async () => {
      const response = await api.get('/ai/scores');
      return (response.data.scores || [])
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Employees',
      value: metrics?.totalEmployees || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active Employees',
      value: metrics?.activeEmployees || 0,
      icon: Activity,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Assigned Tasks',
      value: metrics?.assignedTasks || 0,
      icon: CheckSquare,
      color: 'bg-yellow-500',
      bgLight: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Completed Tasks',
      value: metrics?.completedTasks || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your team.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.bgLight} p-3 rounded-lg`}>
                  <Icon className={card.textColor} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity Indicators - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Productivity Overview</h2>
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            
            {metrics?.productivityIndicators ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900">Completion Rate</p>
                    <ArrowUp className="text-blue-600" size={16} />
                  </div>
                  <p className="text-3xl font-bold text-blue-900">
                    {metrics.productivityIndicators.averageCompletionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Tasks completed vs assigned</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-900">Avg Productivity</p>
                    <Award className="text-green-600" size={16} />
                  </div>
                  <p className="text-3xl font-bold text-green-900">
                    {metrics.productivityIndicators.averageProductivityScore || 'N/A'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">AI-calculated score</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-purple-900">This Week</p>
                    <Clock className="text-purple-600" size={16} />
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    {metrics.productivityIndicators.tasksCompletedThisWeek}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">Tasks completed</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No productivity data yet. Complete some tasks to see insights!</p>
              </div>
            )}

            {/* Monthly Stats */}
            {metrics?.productivityIndicators && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tasks This Month</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {metrics.productivityIndicators.tasksCompletedThisMonth}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(metrics.assignedTasks || 0) + (metrics.completedTasks || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Top Performers</h2>
              <Award className="text-yellow-500" size={20} />
            </div>
            
            {topPerformers && topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((performer: any, index: number) => (
                  <div key={performer.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      } font-bold text-sm`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{performer.employeeName}</p>
                        <p className="text-xs text-gray-500">{performer.employeeRole}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{performer.score}</p>
                      <p className="text-xs text-gray-500">score</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-sm">No performance data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Tasks</h2>
          <CheckSquare className="text-blue-600" size={20} />
        </div>
        
        {tasksData && tasksData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complexity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasksData.slice(0, 5).map((task: any) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{task.employeeName || 'Unassigned'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getComplexityColor(task.complexity)}`}>
                        {task.complexity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="mx-auto mb-3 text-gray-400" size={48} />
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm mt-1">Create your first task to get started!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Ready to boost productivity?</h3>
            <p className="text-blue-100">Explore AI-powered insights to optimize your team's performance</p>
          </div>
          <div className="flex space-x-3">
            <a href="/productivity" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              View Insights
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
