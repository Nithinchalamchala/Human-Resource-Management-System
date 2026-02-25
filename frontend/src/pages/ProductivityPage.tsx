import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, RefreshCw } from 'lucide-react';

export function ProductivityPage() {
  const queryClient = useQueryClient();

  const { data: scores, isLoading } = useQuery({
    queryKey: ['productivity-scores'],
    queryFn: async () => {
      const response = await api.get('/ai/scores');
      return response.data.scores;
    },
  });

  const batchCalculateMutation = useMutation({
    mutationFn: () => api.post('/ai/batch-calculate'),
    onSuccess: () => {
      toast.success('Batch calculation started. Scores will be updated shortly.');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['productivity-scores'] });
      }, 3000);
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading productivity scores...</div>;
  }

  // Sort by score descending
  const sortedScores = [...(scores || [])].sort((a, b) => b.score - a.score);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productivity Scores</h1>
          <p className="text-gray-600 mt-1">AI-powered employee performance analysis</p>
        </div>
        <button
          onClick={() => batchCalculateMutation.mutate()}
          disabled={batchCalculateMutation.isPending}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={batchCalculateMutation.isPending ? 'animate-spin' : ''} />
          <span>Recalculate All</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Completion Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Time (hrs)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedScores.map((item: any, index: number) => (
              <tr key={item.employeeId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {index < 3 && (
                      <TrendingUp
                        size={16}
                        className={
                          index === 0
                            ? 'text-yellow-500 mr-2'
                            : index === 1
                            ? 'text-gray-400 mr-2'
                            : 'text-orange-600 mr-2'
                        }
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.employeeName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.department}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-bold text-gray-900">{item.score.toFixed(1)}</div>
                    <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.score >= 80
                            ? 'bg-green-500'
                            : item.score >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {item.factors.completionRate.toFixed(1)}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {item.factors.averageCompletionTime.toFixed(1)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedScores.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No productivity scores available. Complete some tasks to generate scores.
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Productivity Scores Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Scores are calculated based on task completion rate (40%), completion time (30%), and task complexity (30%)</li>
          <li>• Scores range from 0-100, with higher scores indicating better performance</li>
          <li>• Scores are automatically updated when tasks are completed</li>
          <li>• Use "Recalculate All" to refresh all employee scores</li>
        </ul>
      </div>
    </div>
  );
}
