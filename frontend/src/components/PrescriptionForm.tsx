/**
 * Prescription Form Component
 * Modal form for creating new prescriptions
 */

import { useState, useEffect } from 'react';
import { prescriptionService, medicineService } from '../services/api';
import { Medicine } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface PrescriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  duration: number;
}

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'male' as 'male' | 'female' | 'other',
    doctorName: '',
    doctorLicense: '',
    notes: '',
  });

  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMedicines = async (search: string = '') => {
    try {
      const response = await medicineService.getAll({ limit: 100, search });
      setMedicines(response.data.data.medicines);
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedicines();
      // Reset form when opening
      setFormData({
        patientName: '',
        patientAge: '',
        patientGender: 'male',
        doctorName: '',
        doctorLicense: '',
        notes: '',
      });
      setItems([]);
      setError('');
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medicineId: '',
        medicineName: '',
        quantity: 1,
        dosage: '',
        duration: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If medicine is selected, update medicineName
    if (field === 'medicineId') {
      const medicine = medicines.find((m) => m._id === value);
      if (medicine) {
        newItems[index].medicineName = medicine.name;
      }
    }
    
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.patientName || !formData.doctorName || !formData.doctorLicense) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one medicine item');
      setLoading(false);
      return;
    }

    // Validate all items
    for (const item of items) {
      if (!item.medicineId || !item.dosage || item.quantity < 1 || item.duration < 1) {
        setError('Please fill in all medicine item fields');
        setLoading(false);
        return;
      }
    }

    try {
      await prescriptionService.create({
        ...formData,
        patientAge: parseInt(formData.patientAge),
        items: items.map((item) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: item.quantity,
          dosage: item.dosage,
          duration: item.duration,
        })),
      });

      // Reset form
      setFormData({
        patientName: '',
        patientAge: '',
        patientGender: 'male',
        doctorName: '',
        doctorLicense: '',
        notes: '',
      });
      setItems([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">New Prescription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Patient Name *</label>
              <input
                type="text"
                required
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="input-field"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="label">Patient Age *</label>
              <input
                type="number"
                required
                min="0"
                max="150"
                value={formData.patientAge}
                onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                className="input-field"
                placeholder="30"
              />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select
                required
                value={formData.patientGender}
                onChange={(e) =>
                  setFormData({ ...formData, patientGender: e.target.value as any })
                }
                className="input-field"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Doctor Name *</label>
              <input
                type="text"
                required
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                className="input-field"
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label className="label">Doctor License Number *</label>
              <input
                type="text"
                required
                value={formData.doctorLicense}
                onChange={(e) => setFormData({ ...formData, doctorLicense: e.target.value })}
                className="input-field"
                placeholder="LIC123456"
              />
            </div>
          </div>

          {/* Medicine Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Medicine Items *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-secondary flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Medicine
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No medicines added. Click "Add Medicine" to add items.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Medicine *</label>
                        <select
                          required
                          value={item.medicineId}
                          onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Select Medicine</option>
                          {medicines.map((medicine) => (
                            <option key={medicine._id} value={medicine._id}>
                              {medicine.name} ({medicine.genericName}) - Stock: {medicine.quantity}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Quantity *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', parseInt(e.target.value))
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="label">Dosage *</label>
                        <input
                          type="text"
                          required
                          value={item.dosage}
                          onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                          className="input-field"
                          placeholder="500mg twice daily"
                        />
                      </div>
                      <div>
                        <label className="label">Duration (days) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.duration}
                          onChange={(e) =>
                            handleItemChange(index, 'duration', parseInt(e.target.value))
                          }
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Additional notes or instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || items.length === 0}
            >
              {loading ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionForm;

