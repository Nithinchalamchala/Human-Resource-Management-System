import { Request, Response } from 'express';
import { pool } from '../database/pool';
import { PasswordService } from '../services/auth/password.service';
import { JWTService } from '../services/auth/jwt.service';
import { logger } from '../utils/logger';
import { body, validationResult } from 'express-validator';

export class AuthController {
  /**
   * Register a new organization
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, email, password, industry } = req.body;

      // Validate password strength
      const passwordValidation = PasswordService.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: passwordValidation.message });
        return;
      }

      // Check if organization already exists
      const existingOrg = await pool.query(
        'SELECT id FROM organizations WHERE email = $1',
        [email]
      );

      if (existingOrg.rows.length > 0) {
        res.status(409).json({ error: 'Organization with this email already exists' });
        return;
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(password);

      // Create organization
      const result = await pool.query(
        `INSERT INTO organizations (name, email, password_hash, industry) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, industry, subscription_tier, created_at`,
        [name, email, passwordHash, industry || null]
      );

      const organization = result.rows[0];

      logger.info(`Organization registered: ${organization.id}`);

      res.status(201).json({
        message: 'Organization registered successfully',
        organization: {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          industry: organization.industry,
          subscriptionTier: organization.subscription_tier,
          createdAt: organization.created_at,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login an organization
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find organization
      const result = await pool.query(
        'SELECT id, name, email, password_hash, subscription_tier FROM organizations WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const organization = result.rows[0];

      // Verify password
      const isValidPassword = await PasswordService.verifyPassword(
        password,
        organization.password_hash
      );

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate tokens
      const tokens = JWTService.generateTokens({
        organizationId: organization.id,
        email: organization.email,
        role: 'admin', // Organizations are admins by default
      });

      logger.info(`Organization logged in: ${organization.id}`);

      res.status(200).json({
        message: 'Login successful',
        ...tokens,
        organization: {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          subscriptionTier: organization.subscription_tier,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const tokens = JWTService.refreshTokens(refreshToken);

      res.status(200).json({
        message: 'Token refreshed successfully',
        ...tokens,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  /**
   * Get current organization info
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId;

      const result = await pool.query(
        `SELECT id, name, email, industry, subscription_tier, blockchain_wallet, created_at 
         FROM organizations WHERE id = $1`,
        [organizationId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const organization = result.rows[0];

      res.status(200).json({
        organization: {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          industry: organization.industry,
          subscriptionTier: organization.subscription_tier,
          blockchainWallet: organization.blockchain_wallet,
          createdAt: organization.created_at,
        },
      });
    } catch (error) {
      logger.error('Get organization error:', error);
      res.status(500).json({ error: 'Failed to get organization info' });
    }
  }
}

// Validation rules
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('industry').optional().trim(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];
