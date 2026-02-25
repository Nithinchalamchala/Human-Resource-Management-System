import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

interface ProductivityFactors {
  completionRate: number;
  averageCompletionTime: number;
  taskComplexityHandled: number;
}

interface ProductivityScore {
  employeeId: string;
  score: number;
  factors: ProductivityFactors;
  calculatedAt: Date;
}

export class ProductivityService {
  private static readonly BASELINE_SCORE = 50;
  private static readonly COMPLETION_RATE_WEIGHT = 0.4;
  private static readonly COMPLETION_TIME_WEIGHT = 0.3;
  private static readonly COMPLEXITY_WEIGHT = 0.3;

  /**
   * Calculate productivity score for an employee
   * @param organizationId - Organization ID
   * @param employeeId - Employee ID
   * @returns Productivity score with factors
   */
  static async calculateScore(
    organizationId: string,
    employeeId: string
  ): Promise<ProductivityScore> {
    try {
      // Get employee's tasks
      const tasksResult = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
           COUNT(*) as total_tasks,
           AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FILTER (WHERE status = 'completed') as avg_hours,
           AVG(CASE 
             WHEN complexity = 'low' THEN 1
             WHEN complexity = 'medium' THEN 1.5
             WHEN complexity = 'high' THEN 2
           END) FILTER (WHERE status = 'completed') as avg_complexity
         FROM tasks
         WHERE assigned_to = $1 AND organization_id = $2`,
        [employeeId, organizationId]
      );

      const taskData = tasksResult.rows[0];
      const completedTasks = parseInt(taskData.completed_tasks) || 0;
      const totalTasks = parseInt(taskData.total_tasks) || 0;

      // If no tasks, return baseline score
      if (totalTasks === 0) {
        const baselineScore: ProductivityScore = {
          employeeId,
          score: this.BASELINE_SCORE,
          factors: {
            completionRate: 0,
            averageCompletionTime: 0,
            taskComplexityHandled: 0,
          },
          calculatedAt: new Date(),
        };

        // Store baseline score
        await this.storeScore(organizationId, baselineScore);
        return baselineScore;
      }

      // Calculate factors
      const completionRate = (completedTasks / totalTasks) * 100;
      const avgHours = parseFloat(taskData.avg_hours) || 24; // Default 24 hours if no data
      const avgComplexity = parseFloat(taskData.avg_complexity) || 1;

      // Normalize completion time (lower is better, assume 24 hours is baseline)
      const completionTimeScore = Math.max(0, Math.min(100, (24 / avgHours) * 100));

      // Normalize complexity (higher is better)
      const complexityScore = (avgComplexity / 2) * 100; // Max complexity is 2

      // Calculate weighted score
      const rawScore =
        completionRate * this.COMPLETION_RATE_WEIGHT +
        completionTimeScore * this.COMPLETION_TIME_WEIGHT +
        complexityScore * this.COMPLEXITY_WEIGHT;

      // Normalize to 0-100 scale
      const normalizedScore = Math.max(0, Math.min(100, rawScore));

      const productivityScore: ProductivityScore = {
        employeeId,
        score: parseFloat(normalizedScore.toFixed(2)),
        factors: {
          completionRate: parseFloat(completionRate.toFixed(2)),
          averageCompletionTime: parseFloat(avgHours.toFixed(2)),
          taskComplexityHandled: parseFloat(avgComplexity.toFixed(2)),
        },
        calculatedAt: new Date(),
      };

      // Store score
      await this.storeScore(organizationId, productivityScore);

      logger.info(`Productivity score calculated for employee ${employeeId}: ${normalizedScore}`);

      return productivityScore;
    } catch (error) {
      logger.error('Calculate productivity score error:', error);
      throw new Error('Failed to calculate productivity score');
    }
  }

  /**
   * Store productivity score in database
   * @param organizationId - Organization ID
   * @param score - Productivity score to store
   */
  private static async storeScore(
    organizationId: string,
    score: ProductivityScore
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO productivity_scores 
         (organization_id, employee_id, score, completion_rate, avg_completion_time, complexity_bonus, calculated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          organizationId,
          score.employeeId,
          score.score,
          score.factors.completionRate,
          score.factors.averageCompletionTime,
          score.factors.taskComplexityHandled,
          score.calculatedAt,
        ]
      );
    } catch (error) {
      logger.error('Store productivity score error:', error);
      throw error;
    }
  }

  /**
   * Get latest productivity score for an employee
   * @param organizationId - Organization ID
   * @param employeeId - Employee ID
   * @returns Latest productivity score or null
   */
  static async getLatestScore(
    organizationId: string,
    employeeId: string
  ): Promise<ProductivityScore | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM productivity_scores 
         WHERE organization_id = $1 AND employee_id = $2 
         ORDER BY calculated_at DESC 
         LIMIT 1`,
        [organizationId, employeeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        employeeId: row.employee_id,
        score: parseFloat(row.score),
        factors: {
          completionRate: parseFloat(row.completion_rate),
          averageCompletionTime: parseFloat(row.avg_completion_time),
          taskComplexityHandled: parseFloat(row.complexity_bonus),
        },
        calculatedAt: row.calculated_at,
      };
    } catch (error) {
      logger.error('Get latest score error:', error);
      throw error;
    }
  }

  /**
   * Batch calculate scores for all employees in an organization
   * @param organizationId - Organization ID
   */
  static async batchCalculateScores(organizationId: string): Promise<void> {
    try {
      // Get all employees
      const employeesResult = await pool.query(
        'SELECT id FROM employees WHERE organization_id = $1',
        [organizationId]
      );

      const employees = employeesResult.rows;

      logger.info(`Batch calculating scores for ${employees.length} employees`);

      // Calculate score for each employee
      for (const employee of employees) {
        try {
          await this.calculateScore(organizationId, employee.id);
        } catch (error) {
          logger.error(`Failed to calculate score for employee ${employee.id}:`, error);
          // Continue with other employees
        }
      }

      logger.info('Batch calculation completed');
    } catch (error) {
      logger.error('Batch calculate scores error:', error);
      throw error;
    }
  }

  /**
   * Get productivity scores for all employees
   * @param organizationId - Organization ID
   * @returns Array of productivity scores
   */
  static async getAllScores(organizationId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT ON (ps.employee_id)
           ps.employee_id,
           e.name as employee_name,
           e.role,
           e.department,
           ps.score,
           ps.completion_rate,
           ps.avg_completion_time,
           ps.complexity_bonus,
           ps.calculated_at
         FROM productivity_scores ps
         JOIN employees e ON ps.employee_id = e.id
         WHERE ps.organization_id = $1
         ORDER BY ps.employee_id, ps.calculated_at DESC`,
        [organizationId]
      );

      return result.rows.map(row => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        role: row.role,
        department: row.department,
        score: parseFloat(row.score),
        factors: {
          completionRate: parseFloat(row.completion_rate),
          averageCompletionTime: parseFloat(row.avg_completion_time),
          taskComplexityHandled: parseFloat(row.complexity_bonus),
        },
        calculatedAt: row.calculated_at,
      }));
    } catch (error) {
      logger.error('Get all scores error:', error);
      throw error;
    }
  }
}
