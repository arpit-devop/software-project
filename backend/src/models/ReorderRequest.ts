/**
 * Reorder Request Model
 * Defines the schema for automated reordering requests
 * Tracks purchase requests triggered by low stock thresholds
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Reorder request status
 */
export enum ReorderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

/**
 * Reorder Request interface extending Mongoose Document
 */
export interface IReorderRequest extends Document {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  currentStock: number;
  reorderThreshold: number;
  requestedQuantity: number;
  status: ReorderStatus;
  requestedBy?: mongoose.Types.ObjectId; // System or User ID
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  orderedAt?: Date;
  receivedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reorder Request schema definition
 */
const reorderRequestSchema = new Schema<IReorderRequest>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine ID is required'],
      index: true,
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Current stock cannot be negative'],
    },
    reorderThreshold: {
      type: Number,
      required: [true, 'Reorder threshold is required'],
      min: [0, 'Reorder threshold cannot be negative'],
    },
    requestedQuantity: {
      type: Number,
      required: [true, 'Requested quantity is required'],
      min: [1, 'Requested quantity must be at least 1'],
    },
    status: {
      type: String,
      enum: Object.values(ReorderStatus),
      default: ReorderStatus.PENDING,
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    orderedAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Create indexes for better query performance
 */
reorderRequestSchema.index({ medicineId: 1, status: 1 });
reorderRequestSchema.index({ status: 1 });
reorderRequestSchema.index({ createdAt: -1 });

/**
 * Export ReorderRequest model
 */
export const ReorderRequest = mongoose.model<IReorderRequest>(
  'ReorderRequest',
  reorderRequestSchema
);

