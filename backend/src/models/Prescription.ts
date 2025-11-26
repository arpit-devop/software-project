/**
 * Prescription Model
 * Defines the schema for prescription records with validation
 * Tracks prescription details, validation status, and dispensing history
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Prescription validation status
 */
export enum PrescriptionStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  DISPENSED = 'dispensed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Prescription item interface
 */
export interface IPrescriptionItem {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  quantity: number;
  dosage: string; // e.g., "500mg twice daily"
  duration: number; // days
}

/**
 * Prescription interface extending Mongoose Document
 */
export interface IPrescription extends Document {
  prescriptionNumber: string;
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  doctorName: string;
  doctorLicense: string;
  items: IPrescriptionItem[];
  status: PrescriptionStatus;
  validatedBy?: mongoose.Types.ObjectId; // User ID who validated
  validatedAt?: Date;
  dispensedBy?: mongoose.Types.ObjectId; // User ID who dispensed
  dispensedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prescription schema definition
 */
const prescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionNumber: {
      type: String,
      required: [true, 'Prescription number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    patientAge: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Invalid age'],
    },
    patientGender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Patient gender is required'],
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    doctorLicense: {
      type: String,
      required: [true, 'Doctor license number is required'],
      trim: true,
    },
    items: [
      {
        medicineId: {
          type: Schema.Types.ObjectId,
          ref: 'Medicine',
          required: true,
        },
        medicineName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        dosage: {
          type: String,
          required: true,
          trim: true,
        },
        duration: {
          type: Number,
          required: true,
          min: [1, 'Duration must be at least 1 day'],
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(PrescriptionStatus),
      default: PrescriptionStatus.PENDING,
      index: true,
    },
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    validatedAt: {
      type: Date,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dispensedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
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
prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ createdAt: -1 });
prescriptionSchema.index({ patientName: 'text', doctorName: 'text' });

/**
 * Export Prescription model
 */
export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);

