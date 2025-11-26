/**
 * Medicine Model
 * Defines the schema for pharmaceutical inventory items
 * Tracks stock levels, expiry dates, and reordering thresholds
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Medicine priority levels for usage prioritization
 */
export enum MedicinePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Medicine category types
 */
export enum MedicineCategory {
  ANTIBIOTIC = 'antibiotic',
  ANALGESIC = 'analgesic',
  ANTIVIRAL = 'antiviral',
  CARDIOVASCULAR = 'cardiovascular',
  RESPIRATORY = 'respiratory',
  GASTROINTESTINAL = 'gastrointestinal',
  NEUROLOGICAL = 'neurological',
  OTHER = 'other',
}

/**
 * Medicine interface extending Mongoose Document
 */
export interface IMedicine extends Document {
  name: string;
  genericName: string;
  brandName: string;
  category: MedicineCategory;
  description: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unit: string; // e.g., 'tablets', 'bottles', 'vials'
  pricePerUnit: number;
  reorderThreshold: number; // Minimum stock level before reordering
  priority: MedicinePriority;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  daysUntilExpiry: number;
  isLowStock: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean; // Expiring within 30 days
}

/**
 * Medicine schema definition
 */
const medicineSchema = new Schema<IMedicine>(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic name is required'],
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(MedicineCategory),
      required: [true, 'Category is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required'],
      trim: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      default: 'tablets',
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: [0, 'Price cannot be negative'],
    },
    reorderThreshold: {
      type: Number,
      required: [true, 'Reorder threshold is required'],
      min: [0, 'Reorder threshold cannot be negative'],
      default: 10,
    },
    priority: {
      type: String,
      enum: Object.values(MedicinePriority),
      default: MedicinePriority.MEDIUM,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Virtual field: Calculate days until expiry
 */
medicineSchema.virtual('daysUntilExpiry').get(function () {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

/**
 * Virtual field: Check if stock is low
 */
medicineSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.reorderThreshold;
});

/**
 * Virtual field: Check if medicine is expired
 */
medicineSchema.virtual('isExpired').get(function () {
  const today = new Date();
  return new Date(this.expiryDate) < today;
});

/**
 * Virtual field: Check if medicine is expiring soon (within 30 days)
 */
medicineSchema.virtual('isExpiringSoon').get(function () {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
});

/**
 * Ensure virtual fields are included in JSON output
 */
medicineSchema.set('toJSON', { virtuals: true });
medicineSchema.set('toObject', { virtuals: true });

/**
 * Create indexes for better query performance
 */
medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text' }); // Text search
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ quantity: 1 });
medicineSchema.index({ isActive: 1, isLowStock: 1 });
medicineSchema.index({ category: 1, priority: 1 });

/**
 * Export Medicine model
 */
export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);

