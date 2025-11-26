/**
 * Reorder Service
 * Automated reordering module that triggers purchase requests when stock falls below thresholds
 */

import { Medicine } from '../models/Medicine';
import { ReorderRequest, ReorderStatus } from '../models/ReorderRequest';
import logger, { logReordering } from '../utils/logger';

/**
 * Check all medicines for low stock and create reorder requests
 * This function is called periodically by a cron job
 */
export const checkAndCreateReorderRequests = async (): Promise<void> => {
  try {
    logReordering('Starting automated reorder check', undefined);

    // Find all active medicines with low stock
    const medicines = await Medicine.find({
      isActive: true,
    }).lean();

    let requestsCreated = 0;
    let requestsUpdated = 0;

    for (const medicine of medicines) {
      // Check if stock is at or below reorder threshold
      if (medicine.quantity <= medicine.reorderThreshold) {
        // Check if there's already a pending reorder request for this medicine
        const existingRequest = await ReorderRequest.findOne({
          medicineId: medicine._id,
          status: { $in: [ReorderStatus.PENDING, ReorderStatus.APPROVED] },
        });

        if (existingRequest) {
          // Update existing request if stock has changed significantly
          if (existingRequest.currentStock !== medicine.quantity) {
            await ReorderRequest.findByIdAndUpdate(existingRequest._id, {
              currentStock: medicine.quantity,
            });
            requestsUpdated++;
            logReordering('Updated existing reorder request', medicine._id.toString(), {
              medicineName: medicine.name,
              currentStock: medicine.quantity,
            });
          }
        } else {
          // Calculate requested quantity (typically 3x the reorder threshold)
          const requestedQuantity = Math.max(
            medicine.reorderThreshold * 3,
            50 // Minimum order quantity
          );

          // Create new reorder request
          await ReorderRequest.create({
            medicineId: medicine._id,
            medicineName: medicine.name,
            currentStock: medicine.quantity,
            reorderThreshold: medicine.reorderThreshold,
            requestedQuantity,
            status: ReorderStatus.PENDING,
          });

          requestsCreated++;
          logReordering('Created new reorder request', medicine._id.toString(), {
            medicineName: medicine.name,
            currentStock: medicine.quantity,
            requestedQuantity,
          });
        }
      }
    }

    logReordering('Automated reorder check completed', undefined, {
      requestsCreated,
      requestsUpdated,
      totalMedicinesChecked: medicines.length,
    });
  } catch (error) {
    logger.error('Error in automated reorder check:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all pending reorder requests
 * @returns Array of reorder requests
 */
export const getPendingReorderRequests = async () => {
  try {
    const requests = await ReorderRequest.find({
      status: ReorderStatus.PENDING,
    })
      .populate('medicineId', 'name genericName category priority')
      .sort({ createdAt: -1 });

    return requests;
  } catch (error) {
    logger.error('Error fetching pending reorder requests:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Approve a reorder request
 * @param requestId - Reorder request ID
 * @param userId - User ID who approved
 */
export const approveReorderRequest = async (requestId: string, userId: string): Promise<void> => {
  try {
    const request = await ReorderRequest.findByIdAndUpdate(
      requestId,
      {
        status: ReorderStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!request) {
      throw new Error('Reorder request not found');
    }

    logReordering('Reorder request approved', request.medicineId.toString(), {
      requestId,
      approvedBy: userId,
      medicineName: request.medicineName,
    });
  } catch (error) {
    logger.error('Error approving reorder request:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Mark reorder request as ordered
 * @param requestId - Reorder request ID
 */
export const markReorderRequestAsOrdered = async (requestId: string): Promise<void> => {
  try {
    const request = await ReorderRequest.findByIdAndUpdate(
      requestId,
      {
        status: ReorderStatus.ORDERED,
        orderedAt: new Date(),
      },
      { new: true }
    );

    if (!request) {
      throw new Error('Reorder request not found');
    }

    logReordering('Reorder request marked as ordered', request.medicineId.toString(), {
      requestId,
      medicineName: request.medicineName,
    });
  } catch (error) {
    logger.error('Error marking reorder request as ordered:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Mark reorder request as received and update stock
 * @param requestId - Reorder request ID
 * @param receivedQuantity - Actual quantity received (may differ from requested)
 */
export const markReorderRequestAsReceived = async (
  requestId: string,
  receivedQuantity?: number
): Promise<void> => {
  try {
    const request = await ReorderRequest.findById(requestId).populate('medicineId');

    if (!request) {
      throw new Error('Reorder request not found');
    }

    const quantityToAdd = receivedQuantity || request.requestedQuantity;

    // Update medicine stock
    const medicine = await Medicine.findById(request.medicineId);
    if (medicine) {
      await Medicine.findByIdAndUpdate(request.medicineId, {
        $inc: { quantity: quantityToAdd },
      });

      logReordering('Stock updated from reorder request', request.medicineId.toString(), {
        requestId,
        quantityAdded: quantityToAdd,
        newStock: medicine.quantity + quantityToAdd,
      });
    }

    // Update reorder request status
    await ReorderRequest.findByIdAndUpdate(requestId, {
      status: ReorderStatus.RECEIVED,
      receivedAt: new Date(),
      requestedQuantity: quantityToAdd, // Update if different
    });

    logReordering('Reorder request marked as received', request.medicineId.toString(), {
      requestId,
      medicineName: request.medicineName,
      quantityReceived: quantityToAdd,
    });
  } catch (error) {
    logger.error('Error marking reorder request as received:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

