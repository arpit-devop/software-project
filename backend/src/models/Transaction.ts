/**
 * Transaction Model
 * Defines the schema for inventory transactions
 * Tracks all stock movements for demand trend analysis
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Transaction types
 */
export enum TransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  DISPENSE = 'dispense',
  ADJUSTMENT = 'adjustment',
  EXPIRED = 'expired',
  RETURN = 'return',
}

/**
 * Transaction interface extending Mongoose Document
 */
export interface ITransaction extends Document {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  type: TransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  totalAmount: number;
  performedBy: mongoose.Types.ObjectId; // User ID
  prescriptionId?: mongoose.Types.ObjectId; // If dispensed via prescription
  notes?: string;
  createdAt: Date;
}

/**
 * Transaction schema definition
 */
const transactionSchema = new Schema<ITransaction>(
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
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock is required'],
    },
    newStock: {
      type: Number,
      required: [true, 'New stock is required'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed by user ID is required'],
      index: true,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prescription',
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
 * Create indexes for better query performance and analytics
 */
transactionSchema.index({ medicineId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ performedBy: 1, createdAt: -1 });

/**
 * Export Transaction model
 */
export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

