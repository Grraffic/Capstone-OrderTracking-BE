/**
 * QR Code Generator Utility (Backend)
 *
 * Provides functions to generate QR code data for student orders
 * The QR code contains order information that can be scanned by admins
 */

/**
 * Generate QR code data for an order receipt
 * @param {Object} orderData - Order information
 * @returns {string} JSON string to be encoded in QR code
 */
function generateOrderReceiptQRData(orderData) {
  const qrData = {
    type: "order_receipt",
    orderNumber: orderData.orderNumber || orderData.order_number,
    studentId: orderData.studentId || orderData.student_id,
    studentName: orderData.studentName || orderData.student_name,
    items: (orderData.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      size: item.size || "N/A",
    })),
    totalItems: orderData.quantity || (orderData.items || []).length,
    orderDate:
      orderData.orderDate || orderData.order_date || orderData.created_at || new Date().toISOString(),
    educationLevel: orderData.educationLevel || orderData.education_level || orderData.type || "General",
    status: orderData.status || "pending",
  };

  return JSON.stringify(qrData);
}

module.exports = {
  generateOrderReceiptQRData,
};

