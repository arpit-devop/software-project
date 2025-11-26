/**
 * Analytics Routes
 * Defines API endpoints for analytics and trend analysis
 */

import { Router } from 'express';
import { query } from 'express-validator';
import {
  getDemandTrends,
  getInventoryAnalytics,
  getReorderRecommendations,
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

/**
 * GET /api/analytics/demand-trends
 * Get demand trend analysis for a medicine
 */
router.get(
  '/demand-trends',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  query('medicineId').isMongoId().withMessage('Valid medicine ID is required'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  getDemandTrends
);

/**
 * GET /api/analytics/inventory
 * Get overall inventory analytics
 */
router.get(
  '/inventory',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  getInventoryAnalytics
);

/**
 * GET /api/analytics/reorder-recommendations
 * Get predictive reorder recommendations
 */
router.get(
  '/reorder-recommendations',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  getReorderRecommendations
);

export default router;

