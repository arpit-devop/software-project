/**
 * Prescription Routes
 * Defines API endpoints for prescription management
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getPrescriptions,
  getPrescription,
  createPrescription,
  validatePrescription,
  dispensePrescription,
} from '../controllers/prescriptionController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

/**
 * Validation rules for creating prescription
 */
const createPrescriptionValidation = [
  body('patientName').trim().notEmpty().withMessage('Patient name is required'),
  body('patientAge').isInt({ min: 0, max: 150 }).withMessage('Valid patient age is required'),
  body('patientGender').isIn(['male', 'female', 'other']).withMessage('Valid patient gender is required'),
  body('doctorName').trim().notEmpty().withMessage('Doctor name is required'),
  body('doctorLicense').trim().notEmpty().withMessage('Doctor license number is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one medicine item is required'),
  body('items.*.medicineId').isMongoId().withMessage('Valid medicine ID is required'),
  body('items.*.medicineName').trim().notEmpty().withMessage('Medicine name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('items.*.dosage').trim().notEmpty().withMessage('Dosage is required'),
  body('items.*.duration').isInt({ min: 1 }).withMessage('Valid duration is required'),
];

/**
 * GET /api/prescriptions
 * Get all prescriptions with filtering
 */
router.get('/', authenticate, getPrescriptions);

/**
 * GET /api/prescriptions/:id
 * Get single prescription by ID
 */
router.get('/:id', authenticate, param('id').isMongoId().withMessage('Invalid prescription ID'), getPrescription);

/**
 * POST /api/prescriptions
 * Create new prescription
 */
router.post('/', authenticate, createPrescriptionValidation, createPrescription);

/**
 * POST /api/prescriptions/:id/validate
 * Validate prescription (pharmacist/admin only)
 */
router.post(
  '/:id/validate',
  authenticate,
  authorize(UserRole.PHARMACIST, UserRole.ADMIN),
  param('id').isMongoId().withMessage('Invalid prescription ID'),
  validatePrescription
);

/**
 * POST /api/prescriptions/:id/dispense
 * Dispense prescription (pharmacist/admin only)
 */
router.post(
  '/:id/dispense',
  authenticate,
  authorize(UserRole.PHARMACIST, UserRole.ADMIN),
  param('id').isMongoId().withMessage('Invalid prescription ID'),
  dispensePrescription
);

export default router;

