import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, AlertCircle, CheckCircle, Info } from 'lucide-react';

const OrderForm = ({ orderType = 'uniform', onSubmit, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    email: '',
    category: '',
    item: '',
    size: '',
    quantity: 1,
    reason: '',
    urgency: 'normal'
  });
  const [availableItems, setAvailableItems] = useState([]);
  const [eligibilityStatus, setEligibilityStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const uniformCategories = [
    { id: 'regular', name: 'Regular Uniform', items: ['Polo Shirt', 'Pants', 'Skirt', 'Complete Set'] },
    { id: 'pe', name: 'PE Uniform', items: ['PE Shirt', 'PE Shorts', 'PE Pants', 'Complete PE Set'] },
    { id: 'accessories', name: 'Accessories', items: ['Necktie', 'Belt', 'ID Lace', 'School Bag'] }
  ];

  const merchandiseCategories = [
    { id: 'foundation', name: 'Foundation Week', items: ['Foundation Week Shirt', 'Foundation Week Hoodie'] },
    { id: 'ict', name: 'ICT Week', items: ['ICT Week Shirt', 'ICT Week Mug'] },
    { id: 'accounting', name: 'Accounting Week', items: ['Accounting Week Shirt', 'Accounting Week Tote'] },
    { id: 'broadcasting', name: 'Broadcasting Week', items: ['Broadcasting Week Shirt', 'Broadcasting Week Cap'] },
    { id: 'social_work', name: 'Social Work Week', items: ['Social Work Week Shirt', 'Social Work Week Notebook'] }
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  useEffect(() => {
    // Pre-fill user information
    if (user) {
      setFormData(prev => ({
        ...prev,
        studentName: user.displayName || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if (formData.category) {
      const categories = orderType === 'uniform' ? uniformCategories : merchandiseCategories;
      const selectedCategory = categories.find(cat => cat.id === formData.category);
      setAvailableItems(selectedCategory?.items || []);
      setFormData(prev => ({ ...prev, item: '' }));
    }
  }, [formData.category, orderType]);

  useEffect(() => {
    if (orderType === 'uniform' && formData.studentId) {
      checkEligibility();
    }
  }, [formData.studentId, orderType]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      // Mock eligibility check - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock logic: students are eligible if they haven't ordered in the last 3 years
      const lastOrderDate = new Date('2021-01-01'); // Mock last order date
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      if (lastOrderDate < threeYearsAgo) {
        setEligibilityStatus('eligible');
      } else {
        setEligibilityStatus('needs_approval');
      }
    } catch (error) {
      setEligibilityStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }
    if (!formData.studentName.trim()) {
      newErrors.studentName = 'Student name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.item) {
      newErrors.item = 'Item is required';
    }
    if (!formData.size) {
      newErrors.size = 'Size is required';
    }
    if (orderType === 'uniform' && eligibilityStatus === 'needs_approval' && !formData.reason.trim()) {
      newErrors.reason = 'Reason is required for approval requests';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        orderType,
        eligibilityStatus,
        submittedAt: new Date().toISOString()
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const categories = orderType === 'uniform' ? uniformCategories : merchandiseCategories;

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <ShoppingCart className="h-6 w-6 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {orderType === 'uniform' ? 'School Uniform Order' : 'Event Merchandise Order'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID *
            </label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => handleInputChange('studentId', e.target.value)}
              className={`input ${errors.studentId ? 'border-red-500' : ''}`}
              placeholder="Enter student ID"
            />
            {errors.studentId && (
              <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Name *
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              className={`input ${errors.studentName ? 'border-red-500' : ''}`}
              placeholder="Enter student name"
            />
            {errors.studentName && (
              <p className="mt-1 text-sm text-red-600">{errors.studentName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`input ${errors.email ? 'border-red-500' : ''}`}
            placeholder="Enter email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Eligibility Status for Uniforms */}
        {orderType === 'uniform' && formData.studentId && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Eligibility Status</h3>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="text-sm text-gray-600">Checking eligibility...</span>
              </div>
            ) : eligibilityStatus === 'eligible' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Eligible for free uniform</span>
              </div>
            ) : eligibilityStatus === 'needs_approval' ? (
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Requires approval (recent order found)</span>
              </div>
            ) : eligibilityStatus === 'error' ? (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Unable to check eligibility</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`input ${errors.category ? 'border-red-500' : ''}`}
            >
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item *
            </label>
            <select
              value={formData.item}
              onChange={(e) => handleInputChange('item', e.target.value)}
              className={`input ${errors.item ? 'border-red-500' : ''}`}
              disabled={!formData.category}
            >
              <option value="">Select item</option>
              {availableItems.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.item && (
              <p className="mt-1 text-sm text-red-600">{errors.item}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size *
            </label>
            <select
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              className={`input ${errors.size ? 'border-red-500' : ''}`}
            >
              <option value="">Select size</option>
              {sizes.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            {errors.size && (
              <p className="mt-1 text-sm text-red-600">{errors.size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
              className="input"
            />
          </div>
        </div>

        {/* Reason for Approval (if needed) */}
        {orderType === 'uniform' && eligibilityStatus === 'needs_approval' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for New Uniform Request *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className={`input ${errors.reason ? 'border-red-500' : ''}`}
              placeholder="Please explain why you need a new uniform (e.g., damaged, lost, size change)"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>
        )}

        {/* Urgency Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgency Level
          </label>
          <select
            value={formData.urgency}
            onChange={(e) => handleInputChange('urgency', e.target.value)}
            className="input"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        {/* Information Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Important Information:</p>
              <ul className="list-disc list-inside space-y-1">
                {orderType === 'uniform' ? (
                  <>
                    <li>Free uniforms are available once every 3 academic years</li>
                    <li>You will receive a QR code for order tracking</li>
                    <li>Pickup will be available at the Finance Department</li>
                  </>
                ) : (
                  <>
                    <li>Payment is required before processing merchandise orders</li>
                    <li>Submit payment proof for verification</li>
                    <li>Pickup details will be provided after payment confirmation</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary px-6 py-2"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Submit Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
