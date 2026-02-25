import { Request, Response } from 'express';
import { ProductivityService } from '../services/ai/productivity.service';
import {
  calculateEmployeeSkillGap,
  calculateOrganizationSkillGaps,
  getSkillGapRecommendations,
} from '../services/ai/skillgap.service';
import {
  recommendEmployeesForTask,
  validateEmployeeForTask,
} from '../services/ai/taskassignment.service';
import {
  predictPerformanceTrend,
  predictOrganizationTrends,
  getEmployeesAtRisk,
} from '../services/ai/performancetrend.service';
import { logger } from '../utils/logger';

export class AIController {
  /**
   * Get productivity score for an employee
   */
  static async getProductivityScore(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { employeeId } = req.params;

      // Check if employee exists and belongs to organization
      const { pool } = await import('../database/pool');
      const employeeCheck = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
        [employeeId, organizationId]
      );

      if (employeeCheck.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      // Try to get latest score first
      let score = await ProductivityService.getLatestScore(organizationId, employeeId);

      // If no score exists or score is older than 1 hour, calculate new one
      if (!score || (new Date().getTime() - new Date(score.calculatedAt).getTime()) > 3600000) {
        score = await ProductivityService.calculateScore(organizationId, employeeId);
      }

      res.status(200).json({
        productivityScore: {
          employeeId: score.employeeId,
          score: score.score,
          factors: score.factors,
          calculatedAt: score.calculatedAt,
        },
      });
    } catch (error) {
      logger.error('Get productivity score error:', error);
      res.status(500).json({ error: 'Failed to get productivity score' });
    }
  }

  /**
   * Batch calculate productivity scores for all employees
   */
  static async batchCalculate(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;

      // Start batch calculation asynchronously
      ProductivityService.batchCalculateScores(organizationId).catch(error => {
        logger.error('Batch calculation failed:', error);
      });

      res.status(202).json({
        message: 'Batch calculation started',
        status: 'processing',
      });
    } catch (error) {
      logger.error('Batch calculate error:', error);
      res.status(500).json({ error: 'Failed to start batch calculation' });
    }
  }

  /**
   * Get all productivity scores for organization
   */
  static async getAllScores(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;

      const scores = await ProductivityService.getAllScores(organizationId);

      res.status(200).json({
        scores,
        total: scores.length,
      });
    } catch (error) {
      logger.error('Get all scores error:', error);
      res.status(500).json({ error: 'Failed to get productivity scores' });
    }
  }

  /**
   * Get skill gap analysis for an employee
   */
  static async getEmployeeSkillGap(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { employeeId } = req.params;

      const skillGapData = await getSkillGapRecommendations(
        parseInt(employeeId),
        organizationId
      );

      if (!skillGapData.skillGap) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.status(200).json(skillGapData);
    } catch (error) {
      logger.error('Get skill gap error:', error);
      res.status(500).json({ error: 'Failed to analyze skill gaps' });
    }
  }

  /**
   * Get organization-wide skill gaps
   */
  static async getOrganizationSkillGaps(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;

      const skillGaps = await calculateOrganizationSkillGaps(organizationId);

      res.status(200).json({
        totalGaps: skillGaps.length,
        skillGaps,
      });
    } catch (error) {
      logger.error('Get organization skill gaps error:', error);
      res.status(500).json({ error: 'Failed to analyze organization skill gaps' });
    }
  }

  /**
   * Get task assignment recommendations
   */
  static async getTaskRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { requiredSkills, complexity, department, estimatedHours } = req.body;

      const recommendations = await recommendEmployeesForTask(
        {
          requiredSkills,
          complexity,
          department,
          estimatedHours,
        },
        organizationId
      );

      res.status(200).json({
        count: recommendations.length,
        recommendations,
      });
    } catch (error) {
      logger.error('Get task recommendations error:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }

  /**
   * Validate employee for task assignment
   */
  static async validateTaskAssignment(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { employeeId } = req.params;
      const { requiredSkills, complexity, department, estimatedHours } = req.body;

      const validation = await validateEmployeeForTask(
        parseInt(employeeId),
        {
          requiredSkills,
          complexity,
          department,
          estimatedHours,
        },
        organizationId
      );

      res.status(200).json(validation);
    } catch (error) {
      logger.error('Validate task assignment error:', error);
      res.status(500).json({ error: 'Failed to validate assignment' });
    }
  }

  /**
   * Get performance trend for an employee
   */
  static async getPerformanceTrend(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { employeeId } = req.params;

      const trend = await predictPerformanceTrend(parseInt(employeeId), organizationId);

      if (!trend) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.status(200).json(trend);
    } catch (error) {
      logger.error('Get performance trend error:', error);
      res.status(500).json({ error: 'Failed to predict performance trend' });
    }
  }

  /**
   * Get performance trends for all employees
   */
  static async getOrganizationTrends(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;

      const trends = await predictOrganizationTrends(organizationId);

      res.status(200).json({
        count: trends.length,
        trends,
      });
    } catch (error) {
      logger.error('Get organization trends error:', error);
      res.status(500).json({ error: 'Failed to predict organization trends' });
    }
  }

  /**
   * Get employees at risk (declining performance)
   */
  static async getAtRiskEmployees(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;

      const atRisk = await getEmployeesAtRisk(organizationId);

      res.status(200).json({
        count: atRisk.length,
        employees: atRisk,
      });
    } catch (error) {
      logger.error('Get at-risk employees error:', error);
      res.status(500).json({ error: 'Failed to identify at-risk employees' });
    }
  }
}
