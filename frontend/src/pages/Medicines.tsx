/**
 * Medicines Page
 * Medicine inventory management with CRUD operations
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { medicineService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Medicine } from '../types';
import { Plus, Search, Edit, Trash2, AlertCircle } from 'lucide-react';
import MedicineForm from '../components/MedicineForm';

const Medicines: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filter, setFilter] = useState({
    category: '',
    priority: '',
    lowStock: '',
    expiringSoon: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<string | null>(null);

  /**
   * Update search term when URL parameter changes (from global search)
   */
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    loadMedicines();
  }, [searchTerm, filter]);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50,
      };

      if (searchTerm) params.search = searchTerm;
      if (filter.category) params.category = filter.category;
      if (filter.priority) params.priority = filter.priority;
      if (filter.lowStock === 'true') params.lowStock = 'true';
      if (filter.expiringSoon === 'true') params.expiringSoon = 'true';

      const response = await medicineService.getAll(params);
      setMedicines(response.data.data.medicines);
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user can edit medicines (admin, pharmacist, or staff)
   * Staff can also add medicines to the inventory
   */
  const canEdit = user?.role === 'admin' || user?.role === 'pharmacist' || user?.role === 'staff';

  /**
   * Handle edit medicine - open form with existing data
   */
  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setShowAddModal(true);
  };

  /**
   * Handle delete medicine - confirm and delete from database
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
      return;
    }

    try {
      await medicineService.delete(id);
      loadMedicines(); // Reload medicines from database
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete medicine');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and organize your medicines</p>
        </div>
        {/* Add Medicine button - visible to all authenticated users */}
        <button
          className="flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors shadow-sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Medicine
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="antibiotic">Antibiotic</option>
            <option value="analgesic">Analgesic</option>
            <option value="antiviral">Antiviral</option>
            <option value="cardiovascular">Cardiovascular</option>
            <option value="respiratory">Respiratory</option>
            <option value="gastrointestinal">Gastrointestinal</option>
            <option value="neurological">Neurological</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.lowStock === 'true'}
                onChange={(e) =>
                  setFilter({ ...filter, lowStock: e.target.checked ? 'true' : '' })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2">Low Stock</span>
            </label>
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.expiringSoon === 'true'}
                onChange={(e) =>
                  setFilter({ ...filter, expiringSoon: e.target.checked ? 'true' : '' })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2">Expiring</span>
            </label>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : medicines.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medicine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {medicines.map((medicine) => (
                <tr key={medicine._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{medicine.name}</div>
                      <div className="text-sm text-gray-500">{medicine.genericName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800 capitalize">
                      {medicine.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {medicine.quantity} {medicine.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(medicine.expiryDate).toLocaleDateString()}
                    {medicine.isExpiringSoon && (
                      <AlertCircle className="inline-block ml-2 h-4 w-4 text-orange-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{medicine.pricePerUnit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {medicine.isExpired ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Expired
                      </span>
                    ) : medicine.isLowStock ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(medicine)}
                        className="text-primary-600 hover:text-primary-900 mr-4 transition-colors"
                        title="Edit medicine"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(medicine._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete medicine"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No medicines found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Add your first medicine
            </button>
          </div>
        )}
        </div>
      </div>

      {showAddModal && (
        <MedicineForm
          medicineId={editingMedicine?._id}
          onClose={() => {
            setShowAddModal(false);
            setEditingMedicine(null);
          }}
          onSuccess={() => {
            loadMedicines(); // Reload medicines from database
            setShowAddModal(false);
            setEditingMedicine(null);
          }}
        />
      )}
    </div>
  );
};

export default Medicines;

