/**
 * Medicine Routes
 * Defines API endpoints for medicine inventory management
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getExpiryAlerts,
} from '../controllers/medicineController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

/**
 * Validation rules for creating medicine
 */
const createMedicineValidation = [
  body('name').trim().notEmpty().withMessage('Medicine name is required'),
  body('genericName').trim().notEmpty().withMessage('Generic name is required'),
  body('category').isIn(['antibiotic', 'analgesic', 'antiviral', 'cardiovascular', 'respiratory', 'gastrointestinal', 'neurological', 'other']).withMessage('Invalid category'),
  body('manufacturer').trim().notEmpty().withMessage('Manufacturer is required'),
  body('batchNumber').trim().notEmpty().withMessage('Batch number is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('pricePerUnit').isFloat({ min: 0 }).withMessage('Price per unit must be a non-negative number'),
  body('reorderThreshold').isInt({ min: 0 }).withMessage('Reorder threshold must be a non-negative integer'),
];

/**
 * Validation rules for updating medicine
 */
const updateMedicineValidation = [
  param('id').isMongoId().withMessage('Invalid medicine ID'),
];

/**
 * GET /api/medicines
 * Get all medicines with filtering and pagination
 */
router.get('/', authenticate, getMedicines);

/**
 * GET /api/medicines/expiry-alerts
 * Get medicines with expiry alerts
 */
router.get('/expiry-alerts', authenticate, getExpiryAlerts);

/**
 * GET /api/medicines/:id
 * Get single medicine by ID
 */
router.get('/:id', authenticate, param('id').isMongoId().withMessage('Invalid medicine ID'), getMedicine);

/**
 * POST /api/medicines
 * Create new medicine (admin/pharmacist/staff)
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.STAFF),
  createMedicineValidation,
  createMedicine
);

/**
 * PUT /api/medicines/:id
 * Update medicine (admin/pharmacist/staff)
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.STAFF),
  updateMedicineValidation,
  updateMedicine
);

/**
 * DELETE /api/medicines/:id
 * Delete medicine (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  updateMedicineValidation,
  deleteMedicine
);

export default router;

