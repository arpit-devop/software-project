/**
 * Analytics Page
 * Demand trend analysis and inventory analytics visualization
 */

import { useEffect, useState } from 'react';
import { analyticsService } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, IndianRupee } from 'lucide-react';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, recommendationsRes] = await Promise.all([
        analyticsService.getInventoryAnalytics(30),
        analyticsService.getReorderRecommendations(30),
      ]);

      setAnalytics(analyticsRes.data.data);
      setRecommendations(recommendationsRes.data.data.recommendations);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  // Prepare chart data
  const categoryData = analytics?.categoryDistribution?.map((cat: any) => ({
    name: cat._id,
    count: cat.count,
    value: cat.totalValue,
  })) || [];

  const topSellingData = analytics?.topSelling?.slice(0, 10).map((item: any) => ({
    name: item.medicineName.substring(0, 15),
    quantity: item.totalQuantity,
    amount: item.totalAmount,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Inventory analytics and demand trends</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales (30 days)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{analytics?.sales?.totalAmount?.toFixed(2) || '0.00'}
              </p>
            </div>
            <IndianRupee className="h-10 w-10 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.sales?.totalItems || 0}
              </p>
            </div>
            <Package className="h-10 w-10 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Daily Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.sales?.averagePerDay?.toFixed(1) || '0.0'}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Selling Medicines</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSellingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reorder Recommendations */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reorder Recommendations</h2>
        {recommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Medicine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Until Stockout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recommended Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Urgency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <tr key={rec.medicineId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.medicineName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.daysUntilStockout}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.recommendedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rec.urgency === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : rec.urgency === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : rec.urgency === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {rec.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recommendations available</p>
        )}
      </div>
    </div>
  );
};

export default Analytics;

