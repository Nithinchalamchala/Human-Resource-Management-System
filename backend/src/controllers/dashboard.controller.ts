import { Request, Response } from 'express';
import { pool } from '../database/pool';
import { logger } from '../utils/logger';

export class DashboardController {
  /**
   * Get dashboard metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;

      // Get total employees
      const totalEmployeesResult = await pool.query(
        'SELECT COUNT(*) as count FROM employees WHERE organization_id = $1',
        [organizationId]
      );
      const totalEmployees = parseInt(totalEmployeesResult.rows[0].count);

      // Get active employees (is_active = true)
      // Note: last_activity_at is updated when tasks are completed
      const activeEmployeesResult = await pool.query(
        `SELECT COUNT(*) as count FROM employees 
         WHERE organization_id = $1 
         AND is_active = true`,
        [organizationId]
      );
      const activeEmployees = parseInt(activeEmployeesResult.rows[0].count);

      // Get assigned tasks count
      const assignedTasksResult = await pool.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE organization_id = $1 AND status IN ('assigned', 'in_progress')`,
        [organizationId]
      );
      const assignedTasks = parseInt(assignedTasksResult.rows[0].count);

      // Get completed tasks count
      const completedTasksResult = await pool.query(
        'SELECT COUNT(*) as count FROM tasks WHERE organization_id = $1 AND status = $2',
        [organizationId, 'completed']
      );
      const completedTasks = parseInt(completedTasksResult.rows[0].count);

      // Calculate completion rate
      const totalTasks = assignedTasks + completedTasks;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Get average productivity score
      const avgScoreResult = await pool.query(
        `SELECT AVG(score) as avg_score 
         FROM productivity_scores 
         WHERE organization_id = $1 
         AND calculated_at > NOW() - INTERVAL '30 days'`,
        [organizationId]
      );
      const averageProductivityScore = avgScoreResult.rows[0].avg_score 
        ? parseFloat(avgScoreResult.rows[0].avg_score).toFixed(2) 
        : '0';

      // Get tasks completed this week
      const tasksThisWeekResult = await pool.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE organization_id = $1 
         AND status = 'completed' 
         AND completed_at > NOW() - INTERVAL '7 days'`,
        [organizationId]
      );
      const tasksCompletedThisWeek = parseInt(tasksThisWeekResult.rows[0].count);

      // Get tasks completed this month
      const tasksThisMonthResult = await pool.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE organization_id = $1 
         AND status = 'completed' 
         AND completed_at > NOW() - INTERVAL '30 days'`,
        [organizationId]
      );
      const tasksCompletedThisMonth = parseInt(tasksThisMonthResult.rows[0].count);

      res.status(200).json({
        metrics: {
          totalEmployees,
          activeEmployees,
          assignedTasks,
          completedTasks,
          productivityIndicators: {
            averageCompletionRate: parseFloat(completionRate.toFixed(2)),
            averageProductivityScore: parseFloat(averageProductivityScore),
            tasksCompletedThisWeek,
            tasksCompletedThisMonth,
          },
        },
      });
    } catch (error) {
      logger.error('Get dashboard metrics error:', error);
      res.status(500).json({ error: 'Failed to get dashboard metrics' });
    }
  }

  /**
   * Get productivity trends
   */
  static async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { period = '30d' } = req.query;

      let interval = '30 days';
      if (period === '7d') interval = '7 days';
      else if (period === '90d') interval = '90 days';

      // Get daily task completion trends
      const trendsResult = await pool.query(
        `SELECT 
           DATE(completed_at) as date,
           COUNT(*) as tasks_completed
         FROM tasks
         WHERE organization_id = $1 
         AND status = 'completed'
         AND completed_at > NOW() - INTERVAL '${interval}'
         GROUP BY DATE(completed_at)
         ORDER BY date ASC`,
        [organizationId]
      );

      // Get daily average productivity scores
      const scoresTrendsResult = await pool.query(
        `SELECT 
           DATE(calculated_at) as date,
           AVG(score) as avg_score
         FROM productivity_scores
         WHERE organization_id = $1 
         AND calculated_at > NOW() - INTERVAL '${interval}'
         GROUP BY DATE(calculated_at)
         ORDER BY date ASC`,
        [organizationId]
      );

      res.status(200).json({
        trends: {
          taskCompletions: trendsResult.rows.map(row => ({
            date: row.date,
            value: parseInt(row.tasks_completed),
            metric: 'tasks_completed',
          })),
          productivityScores: scoresTrendsResult.rows.map(row => ({
            date: row.date,
            value: parseFloat(row.avg_score).toFixed(2),
            metric: 'avg_productivity_score',
          })),
        },
        period,
      });
    } catch (error) {
      logger.error('Get trends error:', error);
      res.status(500).json({ error: 'Failed to get trends' });
    }
  }
}
