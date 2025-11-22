import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrderContext = createContext();

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

// Order reducer
const orderReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        loading: false
      };
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders]
      };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id ? { ...order, ...action.payload } : order
        )
      };
    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload)
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

const initialState = {
  orders: [],
  loading: false,
  error: null
};

export const OrderProvider = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, userRole]);

  const fetchOrders = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Mock API call - replace with actual API
      const mockOrders = [
        {
          id: 'ORD-001',
          studentId: 'STU-2024-001',
          studentName: 'Juan Dela Cruz',
          type: 'School Uniform',
          item: 'PE Uniform - Size M',
          size: 'M',
          quantity: 1,
          status: 'pending',
          orderDate: '2024-01-15T10:30:00Z',
          expectedDate: '2024-01-20T10:30:00Z',
          eligibility: 'eligible',
          statusHistory: [
            {
              status: 'submitted',
              message: 'Order submitted successfully',
              timestamp: '2024-01-15T10:30:00Z'
            }
          ]
        },
        {
          id: 'ORD-002',
          studentId: 'STU-2024-001',
          studentName: 'Juan Dela Cruz',
          type: 'Event Merchandise',
          item: 'Foundation Week Shirt - Size L',
          size: 'L',
          quantity: 1,
          status: 'payment_pending',
          orderDate: '2024-01-10T14:15:00Z',
          expectedDate: '2024-01-18T14:15:00Z',
          amount: 350,
          statusHistory: [
            {
              status: 'submitted',
              message: 'Order submitted successfully',
              timestamp: '2024-01-10T14:15:00Z'
            },
            {
              status: 'payment_pending',
              message: 'Waiting for payment verification',
              timestamp: '2024-01-10T14:20:00Z'
            }
          ]
        }
      ];

      // Filter orders based on user role
      let filteredOrders = mockOrders;
      if (userRole === 'student') {
        filteredOrders = mockOrders.filter(order => order.studentId === user?.uid);
      }

      dispatch({ type: 'SET_ORDERS', payload: filteredOrders });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const createOrder = async (orderData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Mock API call - replace with actual API
      const newOrder = {
        id: `ORD-${Date.now()}`,
        ...orderData,
        status: orderData.orderType === 'uniform' ? 'pending' : 'payment_pending',
        orderDate: new Date().toISOString(),
        statusHistory: [
          {
            status: 'submitted',
            message: 'Order submitted successfully',
            timestamp: new Date().toISOString()
          }
        ]
      };

      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      return newOrder;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateOrderStatus = async (orderId, status, message) => {
    try {
      const order = state.orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      const updatedOrder = {
        ...order,
        status,
        statusHistory: [
          ...order.statusHistory,
          {
            status,
            message,
            timestamp: new Date().toISOString()
          }
        ]
      };

      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
      return updatedOrder;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      await updateOrderStatus(orderId, 'cancelled', `Order cancelled: ${reason}`);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const getOrdersByStatus = (status) => {
    return state.orders.filter(order => order.status === status);
  };

  const getOrdersByType = (type) => {
    return state.orders.filter(order => order.type === type);
  };

  const getOrderStats = () => {
    const total = state.orders.length;
    const pending = state.orders.filter(o => o.status === 'pending').length;
    const completed = state.orders.filter(o => o.status === 'completed').length;
    const cancelled = state.orders.filter(o => o.status === 'cancelled').length;

    return { total, pending, completed, cancelled };
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    getOrdersByStatus,
    getOrdersByType,
    getOrderStats,
    fetchOrders,
    clearError
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
