import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface SkillGap {
  skill: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

// interface EmployeeSkillGap {
//   employeeId: number;
//   employeeName: string;
//   role: string;
//   currentSkills: string[];
//   missingSkills: SkillGap[];
//   skillGapScore: number;
// }

interface OrganizationSkillGap {
  skill: string;
  employeesMissing: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedRoles: string[];
}

export default function SkillGapsPage() {
  const [orgSkillGaps, setOrgSkillGaps] = useState<OrganizationSkillGap[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [employeeSkillGap, setEmployeeSkillGap] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgGapsRes, employeesRes] = await Promise.all([
        api.get('/ai/skill-gaps'),
        api.get('/employees'),
      ]);
      setOrgSkillGaps(orgGapsRes.data.skillGaps || []);
      setEmployees(employeesRes.data.employees || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load skill gaps');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSkillGap = async (employeeId: number) => {
    try {
      const res = await api.get(`/ai/skill-gaps/${employeeId}`);
      setEmployeeSkillGap(res.data);
      setSelectedEmployee(employeeId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load employee skill gap');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading skill gaps...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skill Gap Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered skill gap detection and recommendations
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Organization-wide Skill Gaps */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Organization-Wide Skill Gaps
        </h2>
        {orgSkillGaps.length === 0 ? (
          <p className="text-gray-500">No skill gaps detected! 🎉</p>
        ) : (
          <div className="space-y-3">
            {orgSkillGaps.map((gap, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{gap.skill}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(
                          gap.priority
                        )}`}
                      >
                        {gap.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {gap.employeesMissing} employee{gap.employeesMissing !== 1 ? 's' : ''}{' '}
                      missing this skill
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Affected roles: {gap.affectedRoles.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Skill Gap Analysis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Individual Employee Analysis
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Employee
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedEmployee || ''}
            onChange={(e) => fetchEmployeeSkillGap(Number(e.target.value))}
          >
            <option value="">Choose an employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} - {emp.role}
              </option>
            ))}
          </select>
        </div>

        {employeeSkillGap && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {employeeSkillGap.skillGap.employeeName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {employeeSkillGap.skillGap.role}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {employeeSkillGap.skillGap.skillGapScore}%
                  </div>
                  <div className="text-xs text-gray-500">Skill Gap Score</div>
                </div>
              </div>

              {/* Current Skills */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Current Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {employeeSkillGap.skillGap.currentSkills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Missing Skills
                </h4>
                {employeeSkillGap.skillGap.missingSkills.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No missing skills! All required skills are present. 🎉
                  </p>
                ) : (
                  <div className="space-y-2">
                    {employeeSkillGap.skillGap.missingSkills.map(
                      (gap: SkillGap, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{gap.skill}</span>
                            <p className="text-xs text-gray-500 mt-1">{gap.reason}</p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(
                              gap.priority
                            )}`}
                          >
                            {gap.priority}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {employeeSkillGap.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    📋 Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {employeeSkillGap.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-blue-800">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
