/**
 * Type Definitions
 * Shared TypeScript interfaces and types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'pharmacist' | 'staff';
  isActive: boolean;
  createdAt?: string;
}

export interface Medicine {
  _id: string;
  name: string;
  genericName: string;
  brandName?: string;
  category: string;
  description?: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  reorderThreshold: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  daysUntilExpiry?: number;
  isLowStock?: boolean;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prescription {
  _id: string;
  prescriptionNumber: string;
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  doctorName: string;
  doctorLicense: string;
  items: PrescriptionItem[];
  status: 'pending' | 'validated' | 'dispensed' | 'rejected' | 'expired';
  validatedBy?: User;
  validatedAt?: string;
  dispensedBy?: User;
  dispensedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  duration: number;
}

export interface ReorderRequest {
  _id: string;
  medicineId: string | Medicine;
  medicineName: string;
  currentStock: number;
  reorderThreshold: number;
  requestedQuantity: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  requestedBy?: User;
  approvedBy?: User;
  approvedAt?: string;
  orderedAt?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

