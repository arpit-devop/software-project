/**
 * Reorder Controller
 * Handles reorder request operations
 */

import { Request, Response } from 'express';
import { ReorderRequest, ReorderStatus } from '../models/ReorderRequest';
import {
  getPendingReorderRequests,
  approveReorderRequest,
  markReorderRequestAsOrdered,
  markReorderRequestAsReceived,
} from '../services/reorderService';
import logger, { logReordering } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Get all reorder requests
 * @param req - Express request object
 * @param res - Express response object
 */
export const getReorderRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Execute query
    const requests = await ReorderRequest.find(query)
      .populate('medicineId', 'name genericName category priority')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ReorderRequest.countDocuments(query);

    logReordering('Reorder requests retrieved', undefined, {
      count: requests.length,
      page: pageNum,
      status,
    });

    res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching reorder requests:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching reorder requests. Please try again.',
    });
  }
};

/**
 * Get pending reorder requests
 * @param req - Express request object
 * @param res - Express response object
 */
export const getPendingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await getPendingReorderRequests();

    res.status(200).json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    logger.error('Error fetching pending reorder requests:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error fetching pending reorder requests. Please try again.',
    });
  }
};

/**
 * Approve reorder request
 * @param req - Express request object
 * @param res - Express response object
 */
export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid reorder request ID',
      });
      return;
    }

    await approveReorderRequest(id, user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Reorder request approved successfully',
    });
  } catch (error) {
    logger.error('Error approving reorder request:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error approving reorder request. Please try again.',
    });
  }
};

/**
 * Mark reorder request as ordered
 * @param req - Express request object
 * @param res - Express response object
 */
export const markAsOrdered = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid reorder request ID',
      });
      return;
    }

    await markReorderRequestAsOrdered(id);

    res.status(200).json({
      success: true,
      message: 'Reorder request marked as ordered',
    });
  } catch (error) {
    logger.error('Error marking reorder request as ordered:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error updating reorder request. Please try again.',
    });
  }
};

/**
 * Mark reorder request as received
 * @param req - Express request object
 * @param res - Express response object
 */
export const markAsReceived = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { receivedQuantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid reorder request ID',
      });
      return;
    }

    await markReorderRequestAsReceived(id, receivedQuantity);

    res.status(200).json({
      success: true,
      message: 'Reorder request marked as received and stock updated',
    });
  } catch (error) {
    logger.error('Error marking reorder request as received:', {
      workflow: 'reordering',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error updating reorder request. Please try again.',
    });
  }
};

