/**
 * Prescriptions Page
 * Prescription management and validation
 */

import { useEffect, useState } from 'react';
import { prescriptionService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Prescription } from '../types';
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import PrescriptionForm from '../components/PrescriptionForm';

const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, [searchTerm, statusFilter]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await prescriptionService.getAll(params);
      setPrescriptions(response.data.data.prescriptions);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await prescriptionService.validate(id);
      loadPrescriptions();
    } catch (error) {
      console.error('Error validating prescription:', error);
    }
  };

  const handleDispense = async (id: string) => {
    try {
      await prescriptionService.dispense(id);
      loadPrescriptions();
    } catch (error) {
      console.error('Error dispensing prescription:', error);
    }
  };

  const canValidate = user?.role === 'admin' || user?.role === 'pharmacist';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600 mt-1">Manage and validate prescriptions</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Prescription
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="validated">Validated</option>
            <option value="dispensed">Dispensed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <div key={prescription._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {prescription.prescriptionNumber}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        prescription.status === 'dispensed'
                          ? 'bg-green-100 text-green-800'
                          : prescription.status === 'validated'
                          ? 'bg-blue-100 text-blue-800'
                          : prescription.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {prescription.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Patient</p>
                      <p className="font-medium">{prescription.patientName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Doctor</p>
                      <p className="font-medium">{prescription.doctorName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium">{prescription.items.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                {canValidate && prescription.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleValidate(prescription._id)}
                      className="btn-primary flex items-center text-sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Validate
                    </button>
                  </div>
                )}
                {canValidate && prescription.status === 'validated' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleDispense(prescription._id)}
                      className="btn-primary flex items-center text-sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Dispense
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No prescriptions found</p>
          </div>
        )}
      </div>

      {/* Prescription Form Modal */}
      <PrescriptionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          loadPrescriptions();
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

export default Prescriptions;

