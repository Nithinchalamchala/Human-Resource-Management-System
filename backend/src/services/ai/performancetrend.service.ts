import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

interface PerformanceTrend {
  employeeId: number;
  employeeName: string;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number; // 0-100
  currentScore: number;
  predictedScore: number;
  dataPoints: number;
  contributingFactors: string[];
  recommendation: string;
}

interface ScoreDataPoint {
  score: number;
  date: Date;
}

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(dataPoints: ScoreDataPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = dataPoints.length;
  
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  // Convert dates to numeric values (days since first point)
  const firstDate = dataPoints[0].date.getTime();
  const x = dataPoints.map(p => (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
  const y = dataPoints.map(p => p.score);

  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - yMean, 2);
  }

  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, rSquared };
}

/**
 * Get historical productivity scores for an employee
 */
async function getHistoricalScores(
  employeeId: number,
  organizationId: string,
  days: number = 30
): Promise<ScoreDataPoint[]> {
  try {
    const result = await pool.query(
      `SELECT score, calculated_at as date
       FROM productivity_scores
       WHERE employee_id = $1 
       AND organization_id = $2
       AND calculated_at > NOW() - INTERVAL '${days} days'
       ORDER BY calculated_at ASC`,
      [employeeId, organizationId]
    );

    return result.rows.map(row => ({
      score: row.score,
      date: new Date(row.date),
    }));
  } catch (error) {
    logger.error('Error fetching historical scores:', error);
    return [];
  }
}

/**
 * Analyze contributing factors for performance trend
 */
async function analyzeContributingFactors(
  employeeId: number,
  organizationId: string,
  trend: 'improving' | 'declining' | 'stable'
): Promise<string[]> {
  const factors: string[] = [];

  try {
    // Check task completion rate
    const taskResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress')) as active,
        COUNT(*) as total
       FROM tasks
       WHERE assigned_to = $1 
       AND organization_id = $2
       AND created_at > NOW() - INTERVAL '30 days'`,
      [employeeId, organizationId]
    );

    const tasks = taskResult.rows[0];
    const completionRate = tasks.total > 0 
      ? (tasks.completed / tasks.total) * 100 
      : 0;

    if (trend === 'declining') {
      if (completionRate < 50) {
        factors.push('Low task completion rate (< 50%)');
      }
      if (tasks.active > 5) {
        factors.push('High number of pending tasks');
      }
    } else if (trend === 'improving') {
      if (completionRate > 75) {
        factors.push('High task completion rate (> 75%)');
      }
      if (tasks.completed > 5) {
        factors.push('Consistently completing tasks');
      }
    }

    // Check average completion time
    const timeResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours
       FROM tasks
       WHERE assigned_to = $1 
       AND organization_id = $2
       AND status = 'completed'
       AND completed_at > NOW() - INTERVAL '30 days'`,
      [employeeId, organizationId]
    );

    const avgHours = timeResult.rows[0]?.avg_hours;
    if (avgHours) {
      if (trend === 'improving' && avgHours < 24) {
        factors.push('Fast task completion times');
      } else if (trend === 'declining' && avgHours > 72) {
        factors.push('Slow task completion times');
      }
    }

    // Check task complexity
    const complexityResult = await pool.query(
      `SELECT complexity, COUNT(*) as count
       FROM tasks
       WHERE assigned_to = $1 
       AND organization_id = $2
       AND status = 'completed'
       AND completed_at > NOW() - INTERVAL '30 days'
       GROUP BY complexity`,
      [employeeId, organizationId]
    );

    const complexityMap = new Map(
      complexityResult.rows.map(r => [r.complexity, parseInt(r.count)])
    );

    const highComplexity = complexityMap.get('high') || 0;
    const totalCompleted = Array.from(complexityMap.values()).reduce((a, b) => a + b, 0);

    if (trend === 'improving' && highComplexity > totalCompleted * 0.3) {
      factors.push('Successfully handling complex tasks');
    }

    // If no specific factors found
    if (factors.length === 0) {
      if (trend === 'stable') {
        factors.push('Consistent performance over time');
      } else if (trend === 'improving') {
        factors.push('General improvement in work quality');
      } else {
        factors.push('Performance variation detected');
      }
    }

  } catch (error) {
    logger.error('Error analyzing contributing factors:', error);
    factors.push('Unable to determine specific factors');
  }

  return factors;
}

/**
 * Predict performance trend for an employee
 */
export async function predictPerformanceTrend(
  employeeId: number,
  organizationId: string
): Promise<PerformanceTrend | null> {
  try {
    // Get employee details
    const employeeResult = await pool.query(
      `SELECT name FROM employees WHERE id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );

    if (employeeResult.rows.length === 0) {
      return null;
    }

    const employeeName = employeeResult.rows[0].name;

    // Get historical scores (last 30 days)
    const historicalScores = await getHistoricalScores(
      employeeId,
      organizationId,
      30
    );

    // Need at least 4 data points for meaningful trend analysis
    if (historicalScores.length < 4) {
      return {
        employeeId,
        employeeName,
        trend: 'stable',
        confidence: 0,
        currentScore: historicalScores[historicalScores.length - 1]?.score || 50,
        predictedScore: historicalScores[historicalScores.length - 1]?.score || 50,
        dataPoints: historicalScores.length,
        contributingFactors: ['Insufficient data for trend analysis (need 4+ scores)'],
        recommendation: 'Continue monitoring performance. More data needed for accurate prediction.',
      };
    }

    // Calculate linear regression
    const { slope, intercept, rSquared } = calculateLinearRegression(historicalScores);

    // Determine trend based on slope
    let trend: 'improving' | 'declining' | 'stable';
    if (slope > 0.5) {
      trend = 'improving';
    } else if (slope < -0.5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Calculate confidence based on R-squared (0-100)
    const confidence = Math.round(Math.abs(rSquared) * 100);

    // Get current and predicted scores
    const currentScore = historicalScores[historicalScores.length - 1].score;
    const daysAhead = 7; // Predict 7 days ahead
    const lastX = (historicalScores[historicalScores.length - 1].date.getTime() - 
                   historicalScores[0].date.getTime()) / (1000 * 60 * 60 * 24);
    const predictedScore = Math.max(0, Math.min(100, 
      Math.round(slope * (lastX + daysAhead) + intercept)
    ));

    // Analyze contributing factors
    const contributingFactors = await analyzeContributingFactors(
      employeeId,
      organizationId,
      trend
    );

    // Generate recommendation
    let recommendation: string;
    if (trend === 'declining') {
      if (confidence > 70) {
        recommendation = 'Immediate attention needed. Consider one-on-one meeting to discuss challenges and provide support.';
      } else {
        recommendation = 'Monitor closely. May need intervention if trend continues.';
      }
    } else if (trend === 'improving') {
      recommendation = 'Positive trend! Consider recognizing achievements and providing growth opportunities.';
    } else {
      recommendation = 'Performance is stable. Continue current approach and monitor for changes.';
    }

    return {
      employeeId,
      employeeName,
      trend,
      confidence,
      currentScore,
      predictedScore,
      dataPoints: historicalScores.length,
      contributingFactors,
      recommendation,
    };
  } catch (error) {
    logger.error('Error predicting performance trend:', error);
    throw error;
  }
}

/**
 * Get performance trends for all employees in organization
 */
export async function predictOrganizationTrends(
  organizationId: string
): Promise<PerformanceTrend[]> {
  try {
    // Get all active employees
    const employeesResult = await pool.query(
      `SELECT id FROM employees 
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );

    const trends: PerformanceTrend[] = [];

    for (const employee of employeesResult.rows) {
      const trend = await predictPerformanceTrend(employee.id, organizationId);
      if (trend) {
        trends.push(trend);
      }
    }

    // Sort by confidence (highest first) and then by trend (declining first)
    trends.sort((a, b) => {
      if (a.trend === 'declining' && b.trend !== 'declining') return -1;
      if (a.trend !== 'declining' && b.trend === 'declining') return 1;
      return b.confidence - a.confidence;
    });

    return trends;
  } catch (error) {
    logger.error('Error predicting organization trends:', error);
    throw error;
  }
}

/**
 * Get employees at risk (declining performance)
 */
export async function getEmployeesAtRisk(
  organizationId: string
): Promise<PerformanceTrend[]> {
  const allTrends = await predictOrganizationTrends(organizationId);
  
  return allTrends.filter(
    trend => trend.trend === 'declining' && trend.confidence > 50
  );
}
