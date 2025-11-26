/**
 * Prescription Controller
 * Handles prescription validation and dispensing operations
 */

import { Request, Response } from 'express';
import { Prescription, PrescriptionStatus, IPrescription } from '../models/Prescription';
import { Medicine } from '../models/Medicine';
import { Transaction, TransactionType } from '../models/Transaction';
import logger, { logPrescription } from '../utils/logger';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Get all prescriptions with filtering
 * @param req - Express request object
 * @param res - Express response object
 */
export const getPrescriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { prescriptionNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const prescriptions = await Prescription.find(query)
      .populate('validatedBy', 'name email')
      .populate('dispensedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Prescription.countDocuments(query);

    logPrescription('Prescriptions retrieved', undefined, {
      count: prescriptions.length,
      page: pageNum,
      filters: { status, search },
    });

    res.status(200).json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching prescriptions:', {
      workflow: 'prescription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions. Please try again.',
    });
  }
};

/**
 * Get single prescription by ID
 * @param req - Express request object
 * @param res - Express response object
 */
export const getPrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid prescription ID',
      });
      return;
    }

    const prescription = await Prescription.findById(id)
      .populate('validatedBy', 'name email')
      .populate('dispensedBy', 'name email')
      .populate('items.medicineId', 'name genericName quantity expiryDate');

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
      return;
    }

    logPrescription('Prescription retrieved', id);

    res.status(200).json({
      success: true,
      data: { prescription },
    });
  } catch (error) {
    logger.error('Error fetching prescription:', {
      workflow: 'prescription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching prescription. Please try again.',
    });
  }
};

/**
 * Create new prescription
 * @param req - Express request object
 * @param res - Express response object
 */
export const createPrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const prescriptionData = req.body;

    // Generate unique prescription number
    const prescriptionNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create prescription
    const prescription = await Prescription.create({
      ...prescriptionData,
      prescriptionNumber,
      status: PrescriptionStatus.PENDING,
    });

    logPrescription('Prescription created', prescription._id.toString(), {
      prescriptionNumber,
      patientName: prescription.patientName,
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: { prescription },
    });
  } catch (error) {
    logger.error('Error creating prescription:', {
      workflow: 'prescription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error creating prescription. Please try again.',
    });
  }
};

/**
 * Validate prescription
 * Checks medicine availability, expiry, and dosage safety
 * @param req - Express request object
 * @param res - Express response object
 */
export const validatePrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid prescription ID',
      });
      return;
    }

    const prescription = await Prescription.findById(id).populate('items.medicineId');

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
      return;
    }

    if (prescription.status !== PrescriptionStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: `Prescription is already ${prescription.status}`,
      });
      return;
    }

    // Validate each medicine in prescription
    const validationErrors: string[] = [];
    const today = new Date();

    for (const item of prescription.items) {
      const medicine = await Medicine.findById(item.medicineId);

      if (!medicine) {
        validationErrors.push(`Medicine ${item.medicineName} not found`);
        continue;
      }

      // Check if medicine is active
      if (!medicine.isActive) {
        validationErrors.push(`Medicine ${item.medicineName} is not available`);
        continue;
      }

      // Check stock availability
      if (medicine.quantity < item.quantity) {
        validationErrors.push(
          `Insufficient stock for ${item.medicineName}. Available: ${medicine.quantity}, Required: ${item.quantity}`
        );
        continue;
      }

      // Check expiry date
      if (new Date(medicine.expiryDate) < today) {
        validationErrors.push(`Medicine ${item.medicineName} has expired`);
        continue;
      }

      // Check if expiring soon (within 30 days)
      const expiryDate = new Date(medicine.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        // Warning but not blocking
        logPrescription('Medicine expiring soon in prescription', prescription._id.toString(), {
          medicineName: item.medicineName,
          daysUntilExpiry,
        });
      }
    }

    // If validation errors exist, reject prescription
    if (validationErrors.length > 0) {
      await Prescription.findByIdAndUpdate(id, {
        status: PrescriptionStatus.REJECTED,
        rejectionReason: validationErrors.join('; '),
        validatedBy: user._id,
        validatedAt: new Date(),
      });

      logPrescription('Prescription validation failed', id, {
        errors: validationErrors,
        validatedBy: user._id.toString(),
      });

      res.status(400).json({
        success: false,
        message: 'Prescription validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Mark prescription as validated
    await Prescription.findByIdAndUpdate(id, {
      status: PrescriptionStatus.VALIDATED,
      validatedBy: user._id,
      validatedAt: new Date(),
      notes: notes || prescription.notes,
    });

    logPrescription('Prescription validated successfully', id, {
      validatedBy: user._id.toString(),
    });

    const updatedPrescription = await Prescription.findById(id);

    res.status(200).json({
      success: true,
      message: 'Prescription validated successfully',
      data: { prescription: updatedPrescription },
    });
  } catch (error) {
    logger.error('Error validating prescription:', {
      workflow: 'prescription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error validating prescription. Please try again.',
    });
  }
};

/**
 * Dispense prescription
 * Updates stock and creates transaction records
 * @param req - Express request object
 * @param res - Express response object
 */
export const dispensePrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid prescription ID',
      });
      return;
    }

    const prescription = await Prescription.findById(id).populate('items.medicineId');

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
      return;
    }

    if (prescription.status !== PrescriptionStatus.VALIDATED) {
      res.status(400).json({
        success: false,
        message: `Prescription must be validated before dispensing. Current status: ${prescription.status}`,
      });
      return;
    }

    // Dispense each medicine
    const transactions = [];

    for (const item of prescription.items) {
      const medicine = await Medicine.findById(item.medicineId);

      if (!medicine) {
        throw new Error(`Medicine ${item.medicineName} not found`);
      }

      // Check stock again (in case it changed)
      if (medicine.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.medicineName}. Available: ${medicine.quantity}, Required: ${item.quantity}`
        );
      }

      // Update stock
      const previousStock = medicine.quantity;
      const newStock = previousStock - item.quantity;

      await Medicine.findByIdAndUpdate(item.medicineId, {
        quantity: newStock,
      });

      // Create transaction
      const transaction = await Transaction.create({
        medicineId: medicine._id,
        medicineName: medicine.name,
        type: TransactionType.DISPENSE,
        quantity: item.quantity,
        previousStock,
        newStock,
        unitPrice: medicine.pricePerUnit,
        totalAmount: item.quantity * medicine.pricePerUnit,
        performedBy: user._id,
        prescriptionId: prescription._id,
        notes: `Dispensed via prescription ${prescription.prescriptionNumber}`,
      });

      transactions.push(transaction);
    }

    // Update prescription status
    await Prescription.findByIdAndUpdate(id, {
      status: PrescriptionStatus.DISPENSED,
      dispensedBy: user._id,
      dispensedAt: new Date(),
    });

    logPrescription('Prescription dispensed', id, {
      dispensedBy: user._id.toString(),
      itemsCount: prescription.items.length,
    });

    const updatedPrescription = await Prescription.findById(id);

    res.status(200).json({
      success: true,
      message: 'Prescription dispensed successfully',
      data: {
        prescription: updatedPrescription,
        transactions,
      },
    });
  } catch (error) {
    logger.error('Error dispensing prescription:', {
      workflow: 'prescription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error dispensing prescription. Please try again.',
    });
  }
};

