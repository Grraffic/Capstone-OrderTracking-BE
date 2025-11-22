import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  AlertCircle,
  QrCode 
} from 'lucide-react';

const OrderTracker = ({ order }) => {
  const getOrderSteps = (orderType) => {
    if (orderType === 'uniform') {
      return [
        { id: 'submitted', label: 'Order Submitted', icon: Clock },
        { id: 'approved', label: 'Approved', icon: CheckCircle },
        { id: 'processing', label: 'Processing', icon: Package },
        { id: 'ready', label: 'Ready for Pickup', icon: Truck },
        { id: 'completed', label: 'Completed', icon: CheckCircle }
      ];
    } else {
      return [
        { id: 'submitted', label: 'Order Submitted', icon: Clock },
        { id: 'payment_pending', label: 'Payment Pending', icon: AlertCircle },
        { id: 'payment_verified', label: 'Payment Verified', icon: CheckCircle },
        { id: 'processing', label: 'Processing', icon: Package },
        { id: 'ready', label: 'Ready for Pickup', icon: Truck },
        { id: 'completed', label: 'Completed', icon: CheckCircle }
      ];
    }
  };

  const getCurrentStepIndex = (status, steps) => {
    const statusMap = {
      'submitted': 0,
      'pending_approval': 0,
      'approved': 1,
      'payment_pending': 1,
      'payment_verified': 2,
      'processing': orderType === 'uniform' ? 2 : 3,
      'ready': orderType === 'uniform' ? 3 : 4,
      'completed': orderType === 'uniform' ? 4 : 5,
      'cancelled': -1
    };
    return statusMap[status] || 0;
  };

  const orderType = order.type === 'School Uniform' ? 'uniform' : 'merchandise';
  const steps = getOrderSteps(orderType);
  const currentStepIndex = getCurrentStepIndex(order.status, steps);

  const getStepStatus = (stepIndex) => {
    if (order.status === 'cancelled') {
      return 'cancelled';
    }
    if (stepIndex < currentStepIndex) {
      return 'completed';
    } else if (stepIndex === currentStepIndex) {
      return 'current';
    } else {
      return 'upcoming';
    }
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'current':
        return 'bg-primary-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-300 text-gray-600';
    }
  };

  const getConnectorColor = (stepIndex) => {
    if (order.status === 'cancelled') {
      return 'bg-red-200';
    }
    return stepIndex < currentStepIndex ? 'bg-green-600' : 'bg-gray-300';
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Order #{order.id}</h3>
          <p className="text-sm text-gray-500">{order.item}</p>
        </div>
        <div className="flex items-center space-x-2">
          <QrCode className="h-5 w-5 text-gray-400" />
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'cancelled' 
              ? 'bg-red-100 text-red-800'
              : order.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : order.status === 'ready'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const status = getStepStatus(index);
            
            return (
              <div key={step.id} className="flex flex-col items-center relative">
                {/* Step Circle */}
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${getStepColor(status)}
                  ${status === 'current' ? 'ring-4 ring-primary-100' : ''}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    status === 'completed' || status === 'current' 
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={`
                    absolute top-5 left-full w-full h-0.5 
                    ${getConnectorColor(index)}
                    transform -translate-y-1/2
                  `} 
                  style={{ width: 'calc(100% - 20px)', marginLeft: '10px' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Order Information</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Order Date:</dt>
              <dd className="text-sm text-gray-900">
                {new Date(order.orderDate).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Expected Date:</dt>
              <dd className="text-sm text-gray-900">
                {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'TBD'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Type:</dt>
              <dd className="text-sm text-gray-900">{order.type}</dd>
            </div>
            {order.size && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Size:</dt>
                <dd className="text-sm text-gray-900">{order.size}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Status Updates</h4>
          <div className="space-y-2">
            {order.statusHistory?.map((update, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="text-sm text-gray-900">{update.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(update.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No status updates available</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {order.status === 'ready' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                Your order is ready for pickup!
              </p>
              <p className="text-xs text-gray-500">
                Please bring your QR code to the pickup location
              </p>
            </div>
            <button className="btn-primary px-4 py-2">
              Generate Pickup QR
            </button>
          </div>
        </div>
      )}

      {order.status === 'payment_pending' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">
                Payment verification required
              </p>
              <p className="text-xs text-gray-500">
                Please submit your payment proof for verification
              </p>
            </div>
            <button className="btn-warning px-4 py-2">
              Submit Payment Proof
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracker;
