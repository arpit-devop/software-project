/**
 * Reorder Routes
 * Defines API endpoints for reorder request management
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import {
  getReorderRequests,
  getPendingRequests,
  approveRequest,
  markAsOrdered,
  markAsReceived,
} from '../controllers/reorderController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

/**
 * GET /api/reorders
 * Get all reorder requests
 */
router.get('/', authenticate, getReorderRequests);

/**
 * GET /api/reorders/pending
 * Get pending reorder requests
 */
router.get('/pending', authenticate, getPendingRequests);

/**
 * POST /api/reorders/:id/approve
 * Approve reorder request (admin/pharmacist only)
 */
router.post(
  '/:id/approve',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  param('id').isMongoId().withMessage('Invalid reorder request ID'),
  approveRequest
);

/**
 * POST /api/reorders/:id/order
 * Mark reorder request as ordered (admin/pharmacist only)
 */
router.post(
  '/:id/order',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  param('id').isMongoId().withMessage('Invalid reorder request ID'),
  markAsOrdered
);

/**
 * POST /api/reorders/:id/receive
 * Mark reorder request as received (admin/pharmacist only)
 */
router.post(
  '/:id/receive',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST),
  param('id').isMongoId().withMessage('Invalid reorder request ID'),
  body('receivedQuantity').optional().isInt({ min: 1 }).withMessage('Received quantity must be a positive integer'),
  markAsReceived
);

export default router;

