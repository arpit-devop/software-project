/**
 * Authentication Controller
 * Handles user registration, login, and authentication-related operations
 */

import { Request, Response } from 'express';
import { User, UserRole } from '../models/User';
import { generateToken } from '../utils/jwt';
import logger, { logAuth } from '../utils/logger';
import { validationResult } from 'express-validator';

/**
 * Register a new user
 * @param req - Express request object
 * @param res - Express response object
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logAuth('Registration failed: Validation errors', undefined, {
        errors: errors.array(),
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logAuth('Registration failed: User already exists', undefined, {
        email: email.toLowerCase(),
      });
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || UserRole.STAFF,
    });

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email, user.role);

    logAuth('User registered successfully', user._id.toString(), {
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error registering user. Please try again.',
    });
  }
};

/**
 * Login user
 * @param req - Express request object
 * @param res - Express response object
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logAuth('Login failed: Validation errors', undefined, {
        errors: errors.array(),
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      logAuth('Login failed: User not found', undefined, {
        email: email.toLowerCase(),
      });
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      logAuth('Login failed: User account is inactive', user._id.toString(), {
        email: user.email,
      });
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logAuth('Login failed: Invalid password', user._id.toString(), {
        email: user.email,
      });
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email, user.role);

    logAuth('User logged in successfully', user._id.toString(), {
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error logging in. Please try again.',
    });
  }
};

/**
 * Get current user profile
 * @param req - Express request object (with authenticated user)
 * @param res - Express response object
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is attached to request by authenticate middleware
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', {
      workflow: 'authentication',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching profile. Please try again.',
    });
  }
};

