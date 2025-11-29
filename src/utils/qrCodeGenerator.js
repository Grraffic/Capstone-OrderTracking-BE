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
  // Validate and ensure all required fields have realistic values
  const orderNumber = orderData.orderNumber || orderData.order_number;
  if (!orderNumber) {
    throw new Error("Order number is required for QR code generation");
  }

  const studentId = orderData.studentId || orderData.student_id || "unknown";
  const studentName =
    orderData.studentName || orderData.student_name || "Unknown Student";
  const studentEmail = orderData.studentEmail || orderData.student_email || "";

  // Ensure items array is valid and has realistic data
  const items = (orderData.items || []).map((item) => ({
    name: item.name || "Unknown Item",
    quantity: item.quantity || 1,
    size: item.size || "N/A",
  }));

  if (items.length === 0) {
    throw new Error(
      "Order must contain at least one item for QR code generation"
    );
  }

  const totalItems = orderData.quantity || items.length;
  const orderDate =
    orderData.orderDate ||
    orderData.order_date ||
    orderData.created_at ||
    new Date().toISOString();
  const educationLevel =
    orderData.educationLevel ||
    orderData.education_level ||
    orderData.type ||
    "General";
  const status = orderData.status || "pending";
  const totalAmount = orderData.totalAmount || orderData.total_amount || 0;

  const qrData = {
    type: "order_receipt",
    orderNumber,
    studentId,
    studentName,
    studentEmail,
    items,
    totalItems,
    totalAmount,
    orderDate,
    educationLevel,
    status,
  };

  // Validate the generated QR data structure
  if (!qrData.orderNumber || !qrData.studentName || qrData.items.length === 0) {
    throw new Error("Invalid QR code data: missing required fields");
  }

  return JSON.stringify(qrData);
}

module.exports = {
  generateOrderReceiptQRData,
};
