/**
 * Authentication Middleware
 * Handles JWT token verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole, IUser } from '../models/User';
import logger, { logAuth } from '../utils/logger';

/**
 * Extend Express Request interface to include user information
 */
export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * JWT token payload interface
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Verify JWT token and attach user to request
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logAuth('Authentication failed: No token provided', undefined, {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    // Extract token from header
    const token = authHeader.substring(7);

    if (!token) {
      logAuth('Authentication failed: Empty token', undefined, {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not defined in environment variables');
      res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;

    // Find user in database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      logAuth('Authentication failed: User not found', decoded.userId, {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      logAuth('Authentication failed: User account is inactive', user._id.toString(), {
        ip: req.ip,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
      return;
    }

    // Attach user to request object
    req.user = user;
    
    logAuth('User authenticated successfully', user._id.toString(), {
      email: user.email,
      role: user.role,
      path: req.path,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logAuth('Authentication failed: Invalid token', undefined, {
        error: error.message,
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logAuth('Authentication failed: Token expired', undefined, {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
      return;
    }

    logger.error('Authentication error:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
    });
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware to check if user has required role(s)
 * @param allowedRoles - Array of allowed user roles
 * @returns Middleware function
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logAuth('Authorization failed: User not authenticated', undefined, {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      logAuth('Authorization failed: Insufficient permissions', req.user._id.toString(), {
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
      return;
    }

    logAuth('Authorization successful', req.user._id.toString(), {
      userRole: req.user.role,
      path: req.path,
    });

    next();
  };
};

