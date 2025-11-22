import { useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  generateOrderNumber,
  generateOrderReceiptQRData,
  validateOrderData,
} from "../../../utils/qrCodeGenerator";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * useOrderSubmission Hook
 *
 * Manages order submission process including:
 * - Order validation
 * - QR code generation
 * - API submission
 * - Success/error handling
 *
 * @returns {Object} Order submission state and functions
 */
export const useOrderSubmission = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  /**
   * Submit an order with QR code generation
   * @param {Object} orderData - Order data to submit
   * @returns {Promise<Object>} Submitted order with QR code
   */
  const submitOrder = useCallback(
    async (orderData) => {
      try {
        setLoading(true);
        setError(null);

        // Generate order number if not provided
        const orderNumber = orderData.orderNumber || generateOrderNumber();

        // Prepare order data
        const completeOrderData = {
          orderNumber,
          studentId: user?.uid,
          studentName: user?.displayName || orderData.studentName,
          studentEmail: user?.email || orderData.studentEmail,
          educationLevel: orderData.educationLevel,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          orderDate: new Date().toISOString(),
          status: "pending",
        };

        // Validate order data
        const validation = validateOrderData(completeOrderData);
        if (!validation.valid) {
          throw new Error(validation.errors.join(", "));
        }

        // Generate QR code data
        const qrCodeData = generateOrderReceiptQRData(completeOrderData);

        // Transform to snake_case for backend
        const backendOrderData = {
          order_number: completeOrderData.orderNumber,
          student_id: completeOrderData.studentId,
          student_name: completeOrderData.studentName,
          student_email: completeOrderData.studentEmail,
          education_level: completeOrderData.educationLevel,
          items: completeOrderData.items,
          total_amount: completeOrderData.totalAmount,
          qr_code_data: qrCodeData,
          status: completeOrderData.status,
        };

        // Submit to backend API
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backendOrderData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to submit order");
        }

        const result = await response.json();

        // Store submitted order with QR code data
        const orderWithQR = {
          ...completeOrderData,
          id: result.data?.id,
          qrCodeData,
        };

        setSubmittedOrder(orderWithQR);
        setLoading(false);

        return orderWithQR;
      } catch (err) {
        console.error("Order submission error:", err);
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [user]
  );

  /**
   * Reset order submission state
   */
  const resetOrder = useCallback(() => {
    setSubmittedOrder(null);
    setError(null);
  }, []);

  /**
   * Calculate total amount from items
   * @param {Array} items - Array of order items
   * @returns {number} Total amount
   */
  const calculateTotal = useCallback((items) => {
    return items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, []);

  return {
    loading,
    error,
    submittedOrder,
    submitOrder,
    resetOrder,
    calculateTotal,
  };
};
