import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface PerformanceTrend {
  employeeId: number;
  employeeName: string;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
  currentScore: number;
  predictedScore: number;
  dataPoints: number;
  contributingFactors: string[];
  recommendation: string;
}

export default function PerformanceTrendsPage() {
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [atRisk, setAtRisk] = useState<PerformanceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedView, setSelectedView] = useState<'all' | 'at-risk'>('all');

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const [trendsRes, atRiskRes] = await Promise.all([
        api.get('/ai/performance-trends'),
        api.get('/ai/at-risk'),
      ]);
      setTrends(trendsRes.data.trends || []);
      setAtRisk(atRiskRes.data.employees || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load performance trends');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '❓';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'stable':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-600';
    if (confidence >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Analyzing performance trends...</div>
      </div>
    );
  }

  const displayTrends = selectedView === 'at-risk' ? atRisk : trends;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Trends</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered performance trend prediction and analysis
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Analyzed</div>
          <div className="text-2xl font-bold text-gray-900">{trends.length}</div>
        </div>
        <div className="bg-green-50 shadow rounded-lg p-4">
          <div className="text-sm text-green-600">Improving</div>
          <div className="text-2xl font-bold text-green-900">
            {trends.filter((t) => t.trend === 'improving').length}
          </div>
        </div>
        <div className="bg-red-50 shadow rounded-lg p-4">
          <div className="text-sm text-red-600">Declining</div>
          <div className="text-2xl font-bold text-red-900">
            {trends.filter((t) => t.trend === 'declining').length}
          </div>
        </div>
        <div className="bg-blue-50 shadow rounded-lg p-4">
          <div className="text-sm text-blue-600">Stable</div>
          <div className="text-2xl font-bold text-blue-900">
            {trends.filter((t) => t.trend === 'stable').length}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedView('all')}
          className={`px-4 py-2 rounded-md font-medium ${
            selectedView === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Employees ({trends.length})
        </button>
        <button
          onClick={() => setSelectedView('at-risk')}
          className={`px-4 py-2 rounded-md font-medium ${
            selectedView === 'at-risk'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          At Risk ({atRisk.length})
        </button>
      </div>

      {/* Trends List */}
      <div className="bg-white shadow rounded-lg">
        {displayTrends.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {selectedView === 'at-risk'
              ? 'No employees at risk! 🎉'
              : 'No performance data available yet. Complete more tasks to generate trends.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayTrends.map((trend) => (
              <div key={trend.employeeId} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {trend.employeeName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getTrendColor(
                          trend.trend
                        )}`}
                      >
                        {getTrendIcon(trend.trend)} {trend.trend.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        Current Score: <strong>{trend.currentScore}</strong>
                      </span>
                      <span>→</span>
                      <span>
                        Predicted: <strong>{trend.predictedScore}</strong>
                      </span>
                      <span className={getConfidenceColor(trend.confidence)}>
                        Confidence: {trend.confidence}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contributing Factors */}
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Contributing Factors:
                  </h4>
                  <ul className="space-y-1">
                    {trend.contributingFactors.map((factor, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendation */}
                <div
                  className={`p-3 rounded-lg ${
                    trend.trend === 'declining'
                      ? 'bg-red-50 border border-red-200'
                      : trend.trend === 'improving'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      trend.trend === 'declining'
                        ? 'text-red-800'
                        : trend.trend === 'improving'
                        ? 'text-green-800'
                        : 'text-blue-800'
                    }`}
                  >
                    <strong>Recommendation:</strong> {trend.recommendation}
                  </p>
                </div>

                {/* Data Points Info */}
                <div className="mt-2 text-xs text-gray-500">
                  Based on {trend.dataPoints} data points
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
