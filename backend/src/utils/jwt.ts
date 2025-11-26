/**
 * JWT Token Utility Functions
 * Handles token generation and verification
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '../models/User';
import logger from './logger';

/**
 * JWT token payload interface
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Generate JWT token for user
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns JWT token string
 */
export const generateToken = (userId: string, email: string, role: UserRole): string => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpire: string = process.env.JWT_EXPIRE || '7d';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const payload: TokenPayload = {
      userId,
      email,
      role,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpire,
    } as SignOptions);

    logger.debug('JWT token generated successfully', {
      workflow: 'authentication',
      userId,
      role,
    });

    return token;
  } catch (error) {
    logger.error('Error generating JWT token:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded token payload
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token:', {
        workflow: 'authentication',
        error: error.message,
      });
      throw new Error('Invalid token');
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token:', {
        workflow: 'authentication',
        error: error.message,
      });
      throw new Error('Token expired');
    }

    logger.error('Error verifying JWT token:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

