import { Request, Response, NextFunction } from 'express';
import { JWTService, TokenPayload } from '../services/auth/jwt.service';
import { logger } from '../utils/logger';

// Extend Express Request type to include auth data
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

/**
 * Middleware to verify JWT token and extract organization context
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      res.status(401).json({ error: 'Token missing' });
      return;
    }

    const payload: TokenPayload = JWTService.verifyAccessToken(token);

    // Inject organization context into request
    req.organizationId = payload.organizationId;
    req.userEmail = payload.email;
    req.userRole = payload.role;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      if (error.message === 'Invalid token') {
        res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        return;
      }
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Admin privileges required for this operation' 
    });
    return;
  }
  next();
}

/**
 * Optional authentication - doesn't fail if token is missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (token) {
      const payload: TokenPayload = JWTService.verifyAccessToken(token);
      req.organizationId = payload.organizationId;
      req.userEmail = payload.email;
      req.userRole = payload.role;
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}
