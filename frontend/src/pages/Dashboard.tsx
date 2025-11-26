/**
 * Dashboard Page
 * Main dashboard with overview statistics and alerts
 */

import { useEffect, useState } from 'react';
import { medicineService, analyticsService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { AlertCircle, TrendingDown, Package, Calendar } from 'lucide-react';
import { Medicine } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStock: 0,
    expiringSoon: 0,
    expired: 0,
  });
  const [expiringMedicines, setExpiringMedicines] = useState<Medicine[]>([]);
  const [lowStockMedicines, setLowStockMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    loadDashboardData();

    // Listen for real-time inventory updates
    if (socket) {
      socket.on('inventory-updated', () => {
        loadDashboardData();
      });
    }

    return () => {
      if (socket) {
        socket.off('inventory-updated');
      }
    };
  }, [socket]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get expiry alerts
      const expiryResponse = await medicineService.getExpiryAlerts({ days: 30 });
      const { expiring, expired } = expiryResponse.data.data;

      // Get low stock medicines
      const medicinesResponse = await medicineService.getAll({ lowStock: 'true', limit: 10 });
      const lowStock = medicinesResponse.data.data.medicines;

      // Get inventory analytics
      const analyticsResponse = await analyticsService.getInventoryAnalytics(30);
      const analytics = analyticsResponse.data.data;

      setStats({
        totalMedicines: analytics.overview.totalMedicines,
        lowStock: analytics.overview.lowStockCount,
        expiringSoon: analytics.overview.expiringCount,
        expired: analytics.overview.expiredCount,
      });

      setExpiringMedicines(expiring.slice(0, 5));
      setLowStockMedicines(lowStock.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your pharmaceutical inventory</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMedicines}</p>
            </div>
            <Package className="h-10 w-10 text-primary-600" />
          </div>
        </div>

        <div className="card border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
            </div>
            <TrendingDown className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="card border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.expiringSoon}</p>
            </div>
            <Calendar className="h-10 w-10 text-orange-500" />
          </div>
        </div>

        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.expired}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Alerts</h2>
          {lowStockMedicines.length > 0 ? (
            <div className="space-y-3">
              {lowStockMedicines.map((medicine) => (
                <div
                  key={medicine._id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{medicine.name}</p>
                    <p className="text-sm text-gray-600">
                      Stock: {medicine.quantity} {medicine.unit}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-yellow-700">
                    Threshold: {medicine.reorderThreshold}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No low stock alerts</p>
          )}
        </div>

        {/* Expiring Soon Alerts */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Expiring Soon</h2>
          {expiringMedicines.length > 0 ? (
            <div className="space-y-3">
              {expiringMedicines.map((medicine) => (
                <div
                  key={medicine._id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{medicine.name}</p>
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(medicine.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-orange-700">
                    {medicine.daysUntilExpiry} days
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No expiring medicines</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

