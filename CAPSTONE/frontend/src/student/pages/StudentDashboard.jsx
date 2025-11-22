import React from "react";
import { useAuth } from "../../context/AuthContext";
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  QrCode,
} from "lucide-react";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useOrderStatus } from "../../hooks/useOrderStatus";

const StudentDashboard = () => {
  const { user } = useAuth();

  // Extract business logic into hooks
  const { stats, recentOrders, notifications, loading, error } =
    useDashboardData();
  const { getStatusColor, getStatusIcon } = useOrderStatus();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.displayName}!
        </h1>
        <p className="mt-2 text-primary-100">
          Manage your uniform orders and track your merchandise requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Orders
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalOrders}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Orders
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.pendingOrders}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Completed
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.completedOrders}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Available Items
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.availableUniforms}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Orders
              </h3>
              <button className="btn-primary px-3 py-1 text-sm flex items-center space-x-1">
                <Plus className="h-4 w-4" />
                <span>New Order</span>
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {order.item}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {order.type} • Order #{order.id}
                    </p>
                    <p className="text-xs text-gray-400">
                      Ordered: {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <QrCode className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div key={notification.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-primary-600 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-outline p-4 flex flex-col items-center space-y-2">
            <ShoppingCart className="h-8 w-8 text-primary-600" />
            <span>Order School Uniform</span>
          </button>
          <button className="btn-outline p-4 flex flex-col items-center space-y-2">
            <Package className="h-8 w-8 text-primary-600" />
            <span>Browse Merchandise</span>
          </button>
          <button className="btn-outline p-4 flex flex-col items-center space-y-2">
            <QrCode className="h-8 w-8 text-primary-600" />
            <span>Scan QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
