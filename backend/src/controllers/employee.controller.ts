import { Request, Response } from 'express';
import { pool } from '../database/pool';
import { logger } from '../utils/logger';
import { body, validationResult } from 'express-validator';

export class EmployeeController {
  /**
   * Create a new employee
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.organizationId;
      const { name, email, role, department, skills, walletAddress } = req.body;

      // Check if employee email already exists in this organization
      const existing = await pool.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND email = $2',
        [organizationId, email]
      );

      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Employee with this email already exists in your organization' });
        return;
      }

      // Create employee
      const result = await pool.query(
        `INSERT INTO employees (organization_id, name, email, role, department, skills, wallet_address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, email, role, department, skills, wallet_address, is_active, created_at`,
        [organizationId, name, email, role, department, JSON.stringify(skills || []), walletAddress || null]
      );

      const employee = result.rows[0];

      logger.info(`Employee created: ${employee.id} for org: ${organizationId}`);

      res.status(201).json({
        message: 'Employee created successfully',
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          skills: employee.skills,
          walletAddress: employee.wallet_address,
          isActive: employee.is_active,
          createdAt: employee.created_at,
        },
      });
    } catch (error) {
      logger.error('Create employee error:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }

  /**
   * List all employees for the organization
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { department, role, isActive } = req.query;

      let query = 'SELECT * FROM employees WHERE organization_id = $1';
      const params: any[] = [organizationId];
      let paramIndex = 2;

      if (department) {
        query += ` AND department = $${paramIndex}`;
        params.push(department);
        paramIndex++;
      }

      if (role) {
        query += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(isActive === 'true');
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.status(200).json({
        employees: result.rows.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          skills: emp.skills,
          walletAddress: emp.wallet_address,
          isActive: emp.is_active,
          lastActivityAt: emp.last_activity_at,
          createdAt: emp.created_at,
        })),
        total: result.rows.length,
      });
    } catch (error) {
      logger.error('List employees error:', error);
      res.status(500).json({ error: 'Failed to list employees' });
    }
  }

  /**
   * Get a single employee
   */
  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM employees WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const emp = result.rows[0];

      res.status(200).json({
        employee: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          skills: emp.skills,
          walletAddress: emp.wallet_address,
          isActive: emp.is_active,
          lastActivityAt: emp.last_activity_at,
          createdAt: emp.created_at,
          updatedAt: emp.updated_at,
        },
      });
    } catch (error) {
      logger.error('Get employee error:', error);
      res.status(500).json({ error: 'Failed to get employee' });
    }
  }

  /**
   * Update an employee
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
      const { name, email, role, department, skills, isActive } = req.body;

      // Check if employee exists
      const existing = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      // Update employee
      const result = await pool.query(
        `UPDATE employees 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             role = COALESCE($3, role),
             department = COALESCE($4, department),
             skills = COALESCE($5, skills),
             is_active = COALESCE($6, is_active)
         WHERE id = $7 AND organization_id = $8
         RETURNING *`,
        [name, email, role, department, skills ? JSON.stringify(skills) : null, isActive, id, organizationId]
      );

      const emp = result.rows[0];

      logger.info(`Employee updated: ${id}`);

      res.status(200).json({
        message: 'Employee updated successfully',
        employee: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          skills: emp.skills,
          walletAddress: emp.wallet_address,
          isActive: emp.is_active,
          updatedAt: emp.updated_at,
        },
      });
    } catch (error) {
      logger.error('Update employee error:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  }

  /**
   * Delete an employee
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM employees WHERE id = $1 AND organization_id = $2 RETURNING id',
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      logger.info(`Employee deleted: ${id}`);

      res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
      logger.error('Delete employee error:', error);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  }

  /**
   * Connect wallet to employee
   */
  static async connectWallet(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.organizationId;
      const { id } = req.params;
      const { walletAddress } = req.body;

      // Validate Ethereum/Polygon wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const result = await pool.query(
        `UPDATE employees 
         SET wallet_address = $1 
         WHERE id = $2 AND organization_id = $3 
         RETURNING id, name, wallet_address`,
        [walletAddress, id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      logger.info(`Wallet connected for employee: ${id}`);

      res.status(200).json({
        message: 'Wallet connected successfully',
        employee: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          walletAddress: result.rows[0].wallet_address,
        },
      });
    } catch (error) {
      logger.error('Connect wallet error:', error);
      res.status(500).json({ error: 'Failed to connect wallet' });
    }
  }
}

// Validation rules
export const createEmployeeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('walletAddress').optional().trim(),
];

export const updateEmployeeValidation = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().trim().notEmpty(),
  body('department').optional().trim().notEmpty(),
  body('skills').optional().isArray(),
  body('isActive').optional().isBoolean(),
];

export const connectWalletValidation = [
  body('walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
];
