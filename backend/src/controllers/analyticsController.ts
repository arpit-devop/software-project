/**
 * Analytics Controller
 * Handles demand trend analysis and predictive inventory optimization
 */

import { Request, Response } from 'express';
import { Transaction, TransactionType } from '../models/Transaction';
import { Medicine } from '../models/Medicine';
import logger, { logAnalytics } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Get demand trend analysis for a specific medicine
 * @param req - Express request object
 * @param res - Express response object
 */
export const getDemandTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicineId, days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId as string)) {
      res.status(400).json({
        success: false,
        message: 'Valid medicine ID is required',
      });
      return;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get transactions for the medicine in the date range
    const transactions = await Transaction.find({
      medicineId,
      type: { $in: [TransactionType.SALE, TransactionType.DISPENSE] },
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Calculate daily demand
    const dailyDemand: { [key: string]: number } = {};
    let totalDemand = 0;

    transactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt).toISOString().split('T')[0];
      if (!dailyDemand[date]) {
        dailyDemand[date] = 0;
      }
      dailyDemand[date] += transaction.quantity;
      totalDemand += transaction.quantity;
    });

    // Calculate average daily demand
    const averageDailyDemand = totalDemand / daysNum;

    // Calculate predicted demand for next 30 days
    const predictedDemand = averageDailyDemand * 30;

    // Get current stock
    const medicine = await Medicine.findById(medicineId);
    const currentStock = medicine?.quantity || 0;

    // Calculate days until stockout (if current trend continues)
    const daysUntilStockout = currentStock > 0 && averageDailyDemand > 0
      ? Math.floor(currentStock / averageDailyDemand)
      : 0;

    logAnalytics('Demand trend analysis retrieved', {
      medicineId: medicineId as string,
      days: daysNum,
      totalDemand,
      averageDailyDemand,
    });

    res.status(200).json({
      success: true,
      data: {
        medicineId,
        period: {
          startDate,
          endDate,
          days: daysNum,
        },
        demand: {
          total: totalDemand,
          averageDaily: averageDailyDemand,
          dailyBreakdown: dailyDemand,
        },
        prediction: {
          next30Days: predictedDemand,
          daysUntilStockout,
        },
        currentStock,
      },
    });
  } catch (error) {
    logger.error('Error fetching demand trends:', {
      workflow: 'analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching demand trends. Please try again.',
    });
  }
};

/**
 * Get overall inventory analytics
 * @param req - Express request object
 * @param res - Express response object
 */
export const getInventoryAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get total medicines
    const totalMedicines = await Medicine.countDocuments({ isActive: true });

    // Get low stock medicines
    const lowStockMedicines = await Medicine.find({
      isActive: true,
    }).lean();

    const lowStockCount = lowStockMedicines.filter(
      (med) => med.quantity <= med.reorderThreshold
    ).length;

    // Get expiring medicines (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringCount = await Medicine.countDocuments({
      isActive: true,
      expiryDate: {
        $lte: thirtyDaysFromNow,
        $gte: new Date(),
      },
    });

    // Get expired medicines
    const expiredCount = await Medicine.countDocuments({
      isActive: true,
      expiryDate: { $lt: new Date() },
    });

    // Get total transactions in period
    const totalTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get total sales/dispenses
    const salesTransactions = await Transaction.find({
      type: { $in: [TransactionType.SALE, TransactionType.DISPENSE] },
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const totalSales = salesTransactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount,
      0
    );

    const totalItemsSold = salesTransactions.reduce(
      (sum, transaction) => sum + transaction.quantity,
      0
    );

    // Get top selling medicines
    const topSelling = await Transaction.aggregate([
      {
        $match: {
          type: { $in: [TransactionType.SALE, TransactionType.DISPENSE] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$medicineId',
          medicineName: { $first: '$medicineName' },
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Calculate category distribution
    const categoryDistribution = await Medicine.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$quantity', '$pricePerUnit'] },
          },
        },
      },
    ]);

    logAnalytics('Inventory analytics retrieved', {
      days: daysNum,
      totalMedicines,
      lowStockCount,
      expiringCount,
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalMedicines,
          lowStockCount,
          expiringCount,
          expiredCount,
        },
        transactions: {
          total: totalTransactions,
          period: { startDate, endDate, days: daysNum },
        },
        sales: {
          totalAmount: totalSales,
          totalItems: totalItemsSold,
          averagePerDay: totalItemsSold / daysNum,
        },
        topSelling,
        categoryDistribution,
      },
    });
  } catch (error) {
    logger.error('Error fetching inventory analytics:', {
      workflow: 'analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching inventory analytics. Please try again.',
    });
  }
};

/**
 * Get predictive reorder recommendations
 * @param req - Express request object
 * @param res - Express response object
 */
export const getReorderRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    // Get all active medicines
    const medicines = await Medicine.find({ isActive: true }).lean();

    const recommendations = [];

    for (const medicine of medicines) {
      // Get demand trend for this medicine
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const transactions = await Transaction.find({
        medicineId: medicine._id,
        type: { $in: [TransactionType.SALE, TransactionType.DISPENSE] },
        createdAt: { $gte: startDate, $lte: endDate },
      }).lean();

      const totalDemand = transactions.reduce(
        (sum, transaction) => sum + transaction.quantity,
        0
      );
      const averageDailyDemand = totalDemand / daysNum;

      // Calculate predicted demand for next 30 days
      const predictedDemand = averageDailyDemand * 30;

      // Calculate recommended reorder quantity
      // Reorder enough to cover predicted demand + safety stock (20% buffer)
      const safetyStock = medicine.reorderThreshold;
      const recommendedQuantity = Math.ceil(predictedDemand + safetyStock);

      // Calculate urgency score (0-100)
      const daysUntilStockout = averageDailyDemand > 0
        ? Math.floor(medicine.quantity / averageDailyDemand)
        : 999;

      let urgency = 'low';
      if (daysUntilStockout <= 7) urgency = 'critical';
      else if (daysUntilStockout <= 14) urgency = 'high';
      else if (daysUntilStockout <= 30) urgency = 'medium';

      // Only include if recommendation is meaningful
      if (recommendedQuantity > 0 && (medicine.quantity <= medicine.reorderThreshold || daysUntilStockout <= 60)) {
        recommendations.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          currentStock: medicine.quantity,
          reorderThreshold: medicine.reorderThreshold,
          averageDailyDemand,
          predictedDemand,
          recommendedQuantity,
          daysUntilStockout,
          urgency,
          priority: medicine.priority,
        });
      }
    }

    // Sort by urgency and priority
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    recommendations.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      if (urgencyDiff !== 0) return urgencyDiff;
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    logAnalytics('Reorder recommendations generated', {
      recommendationsCount: recommendations.length,
      days: daysNum,
    });

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error generating reorder recommendations:', {
      workflow: 'analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error generating reorder recommendations. Please try again.',
    });
  }
};

