/**
 * QR Code Generator Utility
 *
 * Provides functions to generate QR code data for student orders
 * The QR code contains order information that can be scanned by admins
 */

/**
 * Generate QR code data for an order receipt
 * @param {Object} orderData - Order information
 * @returns {string} JSON string to be encoded in QR code
 */
export const generateOrderReceiptQRData = (orderData) => {
  const qrData = {
    type: "order_receipt",
    orderNumber: orderData.orderNumber || orderData.order_number,
    studentId: orderData.studentId || orderData.student_id,
    studentName: orderData.studentName || orderData.student_name,
    studentEmail: orderData.studentEmail || orderData.student_email,
    educationLevel: orderData.educationLevel || orderData.education_level,
    orderDate:
      orderData.orderDate || orderData.order_date || new Date().toISOString(),
    totalAmount: parseFloat(
      orderData.totalAmount || orderData.total_amount || 0
    ),
    items: (orderData.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      size: item.size || null,
      category: item.category || null,
    })),
    status: orderData.status || "pending",
  };

  return JSON.stringify(qrData);
};

/**
 * Parse QR code data from scanned string
 * @param {string} qrString - Scanned QR code string
 * @returns {Object|null} Parsed order data or null if invalid
 */
export const parseOrderReceiptQRData = (qrString) => {
  try {
    const data = JSON.parse(qrString);

    // Validate that it's an order receipt QR code
    if (data.type !== "order_receipt" || !data.orderNumber) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to parse QR code data:", error);
    return null;
  }
};

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20250115-12345)
 * @returns {string} Unique order number
 */
export const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");

  return `ORD-${year}${month}${day}-${random}`;
};

/**
 * Validate order data before generating QR code
 * @param {Object} orderData - Order data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateOrderData = (orderData) => {
  const errors = [];

  if (!orderData.orderNumber && !orderData.order_number) {
    errors.push("Order number is required");
  }

  if (!orderData.studentName && !orderData.student_name) {
    errors.push("Student name is required");
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push("Order must contain at least one item");
  }

  if (
    orderData.totalAmount === undefined &&
    orderData.total_amount === undefined
  ) {
    errors.push("Total amount is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
