import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export interface TokenPayload {
  organizationId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class JWTService {
  /**
   * Generate access and refresh tokens
   * @param payload - Token payload
   * @returns Object containing access and refresh tokens
   */
  static generateTokens(payload: TokenPayload): AuthTokens {
    try {
      const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      } as jwt.SignOptions);

      const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
      } as jwt.SignOptions);

      return {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn,
      };
    } catch (error) {
      logger.error('Error generating tokens:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Verify and decode an access token
   * @param token - JWT access token
   * @returns Decoded token payload
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      logger.error('Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify and decode a refresh token
   * @param token - JWT refresh token
   * @returns Decoded token payload
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      logger.error('Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - JWT refresh token
   * @returns New access and refresh tokens
   */
  static refreshTokens(refreshToken: string): AuthTokens {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      return this.generateTokens(payload);
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw error;
    }
  }
}
