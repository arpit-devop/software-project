import React, { useState, useEffect } from 'react';
import { X, Pill, Tag, Building2, Calendar, IndianRupee, AlertTriangle, Package, FileText } from 'lucide-react';
import { medicineService } from '../services/api';
import { Medicine } from '../types';

interface MedicineFormProps {
    medicineId?: string; // Optional: if provided, form is in edit mode
    onClose: () => void;
    onSuccess: () => void;
}

const MedicineForm: React.FC<MedicineFormProps> = ({ medicineId, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const isEditMode = !!medicineId;
    const [formData, setFormData] = useState({
        name: '',
        genericName: '',
        brandName: '',
        category: 'other',
        description: '',
        manufacturer: '',
        batchNumber: '',
        expiryDate: '',
        quantity: 0,
        unit: 'tablets',
        pricePerUnit: 0,
        reorderThreshold: 10,
        priority: 'medium',
    });

    /**
     * Load medicine data if in edit mode
     */
    useEffect(() => {
        if (medicineId) {
            loadMedicineData();
        }
    }, [medicineId]);

    /**
     * Load existing medicine data from database for editing
     */
    const loadMedicineData = async () => {
        try {
            setLoadingData(true);
            const response = await medicineService.getById(medicineId!);
            const medicine: Medicine = response.data.data.medicine;
            
            // Format expiry date for input field (YYYY-MM-DD)
            const expiryDate = medicine.expiryDate 
                ? new Date(medicine.expiryDate).toISOString().split('T')[0]
                : '';

            setFormData({
                name: medicine.name || '',
                genericName: medicine.genericName || '',
                brandName: medicine.brandName || '',
                category: medicine.category || 'other',
                description: medicine.description || '',
                manufacturer: medicine.manufacturer || '',
                batchNumber: medicine.batchNumber || '',
                expiryDate: expiryDate,
                quantity: medicine.quantity || 0,
                unit: medicine.unit || 'tablets',
                pricePerUnit: medicine.pricePerUnit || 0,
                reorderThreshold: medicine.reorderThreshold || 10,
                priority: medicine.priority || 'medium',
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load medicine data');
        } finally {
            setLoadingData(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    /**
     * Handle form submission - create or update medicine in database
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isEditMode) {
                // Update existing medicine in database
                await medicineService.update(medicineId!, formData);
            } else {
                // Create new medicine in database
                await medicineService.create(formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} medicine`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Pill className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {isEditMode ? 'Update medicine details in inventory' : 'Enter medicine details to add to inventory'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <form id="medicine-form" onSubmit={handleSubmit} className="space-y-8">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                        {/* Basic Information */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-primary-500" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Medicine Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g. Amoxicillin"
                                    />
                                </div>
                                <div>
                                    <label className="label">Generic Name</label>
                                    <input
                                        type="text"
                                        name="genericName"
                                        required
                                        value={formData.genericName}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g. Amoxicillin Trihydrate"
                                    />
                                </div>
                                <div>
                                    <label className="label">Brand Name</label>
                                    <input
                                        type="text"
                                        name="brandName"
                                        value={formData.brandName}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g. Amoxil"
                                    />
                                </div>
                                <div>
                                    <label className="label">Category</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <select
                                            name="category"
                                            required
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="input-field pl-10"
                                        >
                                            <option value="antibiotic">Antibiotic</option>
                                            <option value="analgesic">Analgesic</option>
                                            <option value="antiviral">Antiviral</option>
                                            <option value="cardiovascular">Cardiovascular</option>
                                            <option value="respiratory">Respiratory</option>
                                            <option value="gastrointestinal">Gastrointestinal</option>
                                            <option value="neurological">Neurological</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Manufacturing Details */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                                <Building2 className="h-4 w-4 mr-2 text-primary-500" />
                                Manufacturing Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label className="label">Manufacturer</label>
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        required
                                        value={formData.manufacturer}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Pharmaceutical Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="label">Batch Number</label>
                                    <input
                                        type="text"
                                        name="batchNumber"
                                        required
                                        value={formData.batchNumber}
                                        onChange={handleChange}
                                        className="input-field font-mono"
                                        placeholder="BATCH-001"
                                    />
                                </div>
                                <div>
                                    <label className="label">Expiry Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="date"
                                            name="expiryDate"
                                            required
                                            value={formData.expiryDate}
                                            onChange={handleChange}
                                            className="input-field pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Inventory & Pricing */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                                <Package className="h-4 w-4 mr-2 text-primary-500" />
                                Inventory & Pricing
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="label">Quantity</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        required
                                        min="0"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        required
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="e.g. tablets"
                                    />
                                </div>
                                <div>
                                    <label className="label">Price Per Unit</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            name="pricePerUnit"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.pricePerUnit}
                                            onChange={handleChange}
                                            className="input-field pl-10"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Reorder Level</label>
                                    <input
                                        type="number"
                                        name="reorderThreshold"
                                        required
                                        min="0"
                                        value={formData.reorderThreshold}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Additional Info */}
                        <section>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="label">Priority Level</label>
                                    <div className="flex space-x-4">
                                        {['low', 'medium', 'high', 'critical'].map((p) => (
                                            <label key={p} className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="priority"
                                                    value={p}
                                                    checked={formData.priority === p}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 capitalize">{p}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Additional notes about the medicine..."
                                    />
                                </div>
                            </div>
                        </section>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="medicine-form"
                        disabled={loading}
                        className="btn-primary min-w-[120px]"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                {isEditMode ? 'Updating...' : 'Adding...'}
                            </div>
                        ) : (
                            isEditMode ? 'Update Medicine' : 'Add Medicine'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MedicineForm;
