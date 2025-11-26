/**
 * Reorders Page
 * Reorder request management
 */

import { useEffect, useState } from 'react';
import { reorderService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ReorderRequest } from '../types';
import { CheckCircle, Package, Clock } from 'lucide-react';

const Reorders: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReorderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;

      const response = await reorderService.getAll(params);
      setRequests(response.data.data.requests);
    } catch (error) {
      console.error('Error loading reorder requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await reorderService.approve(id);
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleMarkOrdered = async (id: string) => {
    try {
      await reorderService.markAsOrdered(id);
      loadRequests();
    } catch (error) {
      console.error('Error marking as ordered:', error);
    }
  };

  const handleMarkReceived = async (id: string) => {
    try {
      await reorderService.markAsReceived(id);
      loadRequests();
    } catch (error) {
      console.error('Error marking as received:', error);
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'pharmacist';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reorder Requests</h1>
        <p className="text-gray-600 mt-1">Manage automated reorder requests</p>
      </div>

      {/* Filter */}
      <div className="card">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field max-w-xs"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : requests.length > 0 ? (
          requests.map((request) => (
            <div key={request._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.medicineName}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'received'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'ordered'
                          ? 'bg-blue-100 text-blue-800'
                          : request.status === 'approved'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Current Stock</p>
                      <p className="font-medium">{request.currentStock}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Threshold</p>
                      <p className="font-medium">{request.reorderThreshold}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Requested Quantity</p>
                      <p className="font-medium">{request.requestedQuantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex space-x-2 ml-4">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(request._id)}
                        className="btn-primary flex items-center text-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                    )}
                    {request.status === 'approved' && (
                      <button
                        onClick={() => handleMarkOrdered(request._id)}
                        className="btn-primary flex items-center text-sm"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Mark Ordered
                      </button>
                    )}
                    {request.status === 'ordered' && (
                      <button
                        onClick={() => handleMarkReceived(request._id)}
                        className="btn-primary flex items-center text-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Received
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No reorder requests found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reorders;

