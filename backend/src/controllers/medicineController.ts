/**
 * Medicine Controller
 * Handles CRUD operations for medicine inventory
 */

import { Request, Response } from 'express';
import { Medicine, IMedicine } from '../models/Medicine';
import { Transaction, TransactionType } from '../models/Transaction';
import logger, { logInventory } from '../utils/logger';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Get all medicines with filtering and pagination
 * @param req - Express request object
 * @param res - Express response object
 */
export const getMedicines = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      category,
      priority,
      lowStock,
      expiringSoon,
      expired,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { isActive: true };

    // Text search
    if (search) {
      query.$text = { $search: search as string };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Low stock filter
    if (lowStock === 'true') {
      // This will be handled after fetching
    }

    // Expiring soon filter (within 30 days)
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }

    // Expired filter
    if (expired === 'true') {
      query.expiryDate = { $lt: new Date() };
    }

    // Execute query
    const medicines = await Medicine.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Filter low stock if requested
    let filteredMedicines = medicines;
    if (lowStock === 'true') {
      filteredMedicines = medicines.filter(
        (med) => med.quantity <= med.reorderThreshold
      );
    }

    // Get total count
    const total = await Medicine.countDocuments(query);

    logInventory('Medicines retrieved', undefined, {
      count: filteredMedicines.length,
      page: pageNum,
      filters: { search, category, priority, lowStock, expiringSoon, expired },
    });

    res.status(200).json({
      success: true,
      data: {
        medicines: filteredMedicines,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching medicines:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching medicines. Please try again.',
    });
  }
};

/**
 * Get single medicine by ID
 * @param req - Express request object
 * @param res - Express response object
 */
export const getMedicine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      });
      return;
    }

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
      return;
    }

    logInventory('Medicine retrieved', id);

    res.status(200).json({
      success: true,
      data: { medicine },
    });
  } catch (error) {
    logger.error('Error fetching medicine:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching medicine. Please try again.',
    });
  }
};

/**
 * Create new medicine
 * @param req - Express request object
 * @param res - Express response object
 */
export const createMedicine = async (req: Request, res: Response): Promise<void> => {
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

    const medicineData = req.body;
    const user = (req as any).user;

    // Create medicine
    const medicine = await Medicine.create(medicineData);

    // Create transaction record
    await Transaction.create({
      medicineId: medicine._id,
      medicineName: medicine.name,
      type: TransactionType.PURCHASE,
      quantity: medicine.quantity,
      previousStock: 0,
      newStock: medicine.quantity,
      unitPrice: medicine.pricePerUnit,
      totalAmount: medicine.quantity * medicine.pricePerUnit,
      performedBy: user._id,
      notes: 'Initial stock entry',
    });

    logInventory('Medicine created', medicine._id.toString(), {
      name: medicine.name,
      quantity: medicine.quantity,
      createdBy: user._id.toString(),
    });

    res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: { medicine },
    });
  } catch (error) {
    logger.error('Error creating medicine:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error creating medicine. Please try again.',
    });
  }
};

/**
 * Update medicine
 * @param req - Express request object
 * @param res - Express response object
 */
export const updateMedicine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      });
      return;
    }

    // Get current medicine state
    const currentMedicine = await Medicine.findById(id);
    if (!currentMedicine) {
      res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
      return;
    }

    // Update medicine
    const medicine = await Medicine.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // If quantity changed, create transaction
    if (updateData.quantity !== undefined && updateData.quantity !== currentMedicine.quantity) {
      const quantityDiff = updateData.quantity - currentMedicine.quantity;
      const transactionType = quantityDiff > 0 ? TransactionType.ADJUSTMENT : TransactionType.ADJUSTMENT;

      await Transaction.create({
        medicineId: medicine!._id,
        medicineName: medicine!.name,
        type: transactionType,
        quantity: Math.abs(quantityDiff),
        previousStock: currentMedicine.quantity,
        newStock: updateData.quantity,
        unitPrice: medicine!.pricePerUnit,
        totalAmount: Math.abs(quantityDiff) * medicine!.pricePerUnit,
        performedBy: user._id,
        notes: 'Stock adjustment',
      });
    }

    logInventory('Medicine updated', id, {
      updatedBy: user._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: { medicine },
    });
  } catch (error) {
    logger.error('Error updating medicine:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error updating medicine. Please try again.',
    });
  }
};

/**
 * Delete medicine (soft delete)
 * @param req - Express request object
 * @param res - Express response object
 */
export const deleteMedicine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid medicine ID',
      });
      return;
    }

    // Soft delete by setting isActive to false
    const medicine = await Medicine.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!medicine) {
      res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
      return;
    }

    logInventory('Medicine deleted', id, {
      deletedBy: user._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting medicine:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error deleting medicine. Please try again.',
    });
  }
};

/**
 * Get medicines with expiry alerts
 * @param req - Express request object
 * @param res - Express response object
 */
export const getExpiryAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + daysNum);

    // Find medicines expiring within specified days
    const expiringMedicines = await Medicine.find({
      isActive: true,
      expiryDate: {
        $lte: alertDate,
        $gte: new Date(),
      },
    })
      .sort({ expiryDate: 1 })
      .lean();

    // Find expired medicines
    const expiredMedicines = await Medicine.find({
      isActive: true,
      expiryDate: { $lt: new Date() },
    })
      .sort({ expiryDate: 1 })
      .lean();

    logInventory('Expiry alerts retrieved', undefined, {
      expiringCount: expiringMedicines.length,
      expiredCount: expiredMedicines.length,
      days: daysNum,
    });

    res.status(200).json({
      success: true,
      data: {
        expiring: expiringMedicines,
        expired: expiredMedicines,
      },
    });
  } catch (error) {
    logger.error('Error fetching expiry alerts:', {
      workflow: 'inventory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching expiry alerts. Please try again.',
    });
  }
};

