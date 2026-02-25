import { Request, Response } from 'express';
import { pool } from '../database/pool';
import { logger } from '../utils/logger';
import { body, validationResult } from 'express-validator';
import { TaskStatusService, TaskStatus } from '../services/task/status.service';

export class TaskController {
  /**
   * Create a new task
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.organizationId;
      const { title, description, assignedTo, complexity, dueDate } = req.body;

      // Verify employee exists and belongs to organization
      const employeeCheck = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
        [assignedTo, organizationId]
      );

      if (employeeCheck.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found or does not belong to your organization' });
        return;
      }

      // Create task
      const result = await pool.query(
        `INSERT INTO tasks (organization_id, title, description, assigned_to, complexity, due_date, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'assigned') 
         RETURNING *`,
        [organizationId, title, description, assignedTo, complexity, dueDate || null]
      );

      const task = result.rows[0];

      // Create notification for employee
      await pool.query(
        `INSERT INTO notifications (organization_id, employee_id, type, message) 
         VALUES ($1, $2, 'task_assigned', $3)`,
        [organizationId, assignedTo, `New task assigned: ${title}`]
      );

      logger.info(`Task created: ${task.id} for org: ${organizationId}`);

      res.status(201).json({
        message: 'Task created successfully',
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          status: task.status,
          complexity: task.complexity,
          dueDate: task.due_date,
          createdAt: task.created_at,
        },
      });
    } catch (error) {
      logger.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }

  /**
   * List all tasks for the organization
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { status, assignedTo, department } = req.query;

      let query = `
        SELECT t.*, e.name as employee_name, e.department 
        FROM tasks t
        JOIN employees e ON t.assigned_to = e.id
        WHERE t.organization_id = $1
      `;
      const params: any[] = [organizationId];
      let paramIndex = 2;

      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (assignedTo) {
        query += ` AND t.assigned_to = $${paramIndex}`;
        params.push(assignedTo);
        paramIndex++;
      }

      if (department) {
        query += ` AND e.department = $${paramIndex}`;
        params.push(department);
        paramIndex++;
      }

      query += ' ORDER BY t.created_at DESC';

      const result = await pool.query(query, params);

      res.status(200).json({
        tasks: result.rows.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          employeeName: task.employee_name,
          department: task.department,
          status: task.status,
          complexity: task.complexity,
          dueDate: task.due_date,
          createdAt: task.created_at,
          completedAt: task.completed_at,
        })),
        total: result.rows.length,
      });
    } catch (error) {
      logger.error('List tasks error:', error);
      res.status(500).json({ error: 'Failed to list tasks' });
    }
  }

  /**
   * Get a single task
   */
  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { id } = req.params;

      const result = await pool.query(
        `SELECT t.*, e.name as employee_name, e.email as employee_email 
         FROM tasks t
         JOIN employees e ON t.assigned_to = e.id
         WHERE t.id = $1 AND t.organization_id = $2`,
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const task = result.rows[0];

      res.status(200).json({
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          employeeName: task.employee_name,
          employeeEmail: task.employee_email,
          status: task.status,
          complexity: task.complexity,
          dueDate: task.due_date,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          completedAt: task.completed_at,
        },
      });
    } catch (error) {
      logger.error('Get task error:', error);
      res.status(500).json({ error: 'Failed to get task' });
    }
  }

  /**
   * Update a task
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.organizationId;
      const { id } = req.params;
      const { title, description, assignedTo, complexity, dueDate } = req.body;

      // Check if task exists
      const existing = await pool.query(
        'SELECT id FROM tasks WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // If assignedTo is being changed, verify new employee exists
      if (assignedTo) {
        const employeeCheck = await pool.query(
          'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
          [assignedTo, organizationId]
        );

        if (employeeCheck.rows.length === 0) {
          res.status(404).json({ error: 'Employee not found' });
          return;
        }
      }

      // Update task
      const result = await pool.query(
        `UPDATE tasks 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             assigned_to = COALESCE($3, assigned_to),
             complexity = COALESCE($4, complexity),
             due_date = COALESCE($5, due_date)
         WHERE id = $6 AND organization_id = $7
         RETURNING *`,
        [title, description, assignedTo, complexity, dueDate, id, organizationId]
      );

      const task = result.rows[0];

      logger.info(`Task updated: ${id}`);

      res.status(200).json({
        message: 'Task updated successfully',
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          status: task.status,
          complexity: task.complexity,
          dueDate: task.due_date,
          updatedAt: task.updated_at,
        },
      });
    } catch (error) {
      logger.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }

  /**
   * Update task status
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.organizationId;
      const { id } = req.params;
      const { status } = req.body;

      // Validate status value
      if (!TaskStatusService.isValidStatus(status)) {
        res.status(400).json({ error: 'Invalid status value' });
        return;
      }

      // Get current task
      const currentTask = await pool.query(
        'SELECT status, assigned_to FROM tasks WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );

      if (currentTask.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const currentStatus = currentTask.rows[0].status as TaskStatus;
      const assignedTo = currentTask.rows[0].assigned_to;

      // Validate status transition
      if (!TaskStatusService.isValidTransition(currentStatus, status)) {
        res.status(400).json({ 
          error: TaskStatusService.getTransitionError(currentStatus, status) 
        });
        return;
      }

      // Update status
      const result = await pool.query(
        'UPDATE tasks SET status = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
        [status, id, organizationId]
      );

      const task = result.rows[0];

      // If task is completed, trigger productivity calculation and update employee activity
      if (status === 'completed') {
        // Update employee's last activity timestamp
        await pool.query(
          'UPDATE employees SET last_activity_at = NOW() WHERE id = $1 AND organization_id = $2',
          [assignedTo, organizationId]
        );
        
        logger.info(`Task completed: ${id}, triggering productivity calculation for employee: ${assignedTo}`);
      }

      // Create notification
      await pool.query(
        `INSERT INTO notifications (organization_id, employee_id, type, message) 
         VALUES ($1, $2, 'task_updated', $3)`,
        [organizationId, assignedTo, `Task status updated to: ${status}`]
      );

      logger.info(`Task status updated: ${id} to ${status}`);

      res.status(200).json({
        message: 'Task status updated successfully',
        task: {
          id: task.id,
          status: task.status,
          completedAt: task.completed_at,
          updatedAt: task.updated_at,
        },
      });
    } catch (error) {
      logger.error('Update task status error:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  }

  /**
   * Delete a task
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING id',
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      logger.info(`Task deleted: ${id}`);

      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Delete task error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
}

// Validation rules
export const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('assignedTo').isUUID().withMessage('Valid employee ID is required'),
  body('complexity').isIn(['low', 'medium', 'high']).withMessage('Complexity must be low, medium, or high'),
  body('dueDate').optional().isISO8601().withMessage('Valid date is required'),
];

export const updateTaskValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('assignedTo').optional().isUUID(),
  body('complexity').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601(),
];

export const updateStatusValidation = [
  body('status').isIn(['assigned', 'in_progress', 'completed']).withMessage('Invalid status'),
];
