import { useState, useCallback } from "react";
import { parseOrderReceiptQRData } from "../../../utils/qrCodeGenerator";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * useOrderQRScanner Hook
 *
 * Manages QR scanner for order receipts with complete flow:
 * 1. Scan QR code from student's order receipt
 * 2. Parse QR code data to extract order number
 * 3. Find order in database by order number
 * 4. Update order status from "pending" to "completed"
 * 5. Reduce inventory for all items in the order
 *
 * @returns {Object} Scanner state and functions
 */
export const useOrderQRScanner = () => {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const openQRScanner = useCallback(() => {
    setQrScannerOpen(true);
    setError(null);
    setSuccess(null);
  }, []);

  const closeQRScanner = useCallback(() => {
    setQrScannerOpen(false);
    setError(null);
    setSuccess(null);
    setProcessing(false);
  }, []);

  /**
   * Process scanned QR code data
   * @param {string} scannedData - Raw QR code data
   * @returns {Promise<Object>} Processing result
   */
  const processScannedOrder = useCallback(async (scannedData) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      console.log("Processing scanned QR code:", scannedData);

      // Step 1: Parse QR code data
      const orderData = parseOrderReceiptQRData(scannedData);
      if (!orderData) {
        throw new Error(
          "Invalid QR code format. Please scan a valid order receipt."
        );
      }

      console.log("Parsed order data:", orderData);

      // Step 2: Find order by order number
      const orderNumber = orderData.orderNumber;
      const orderResponse = await fetch(
        `${API_BASE_URL}/orders/number/${orderNumber}`
      );

      if (!orderResponse.ok) {
        if (orderResponse.status === 404) {
          throw new Error(`Order ${orderNumber} not found in database.`);
        }
        throw new Error(`Failed to fetch order: ${orderResponse.statusText}`);
      }

      const orderResult = await orderResponse.json();
      if (!orderResult.success || !orderResult.data) {
        throw new Error("Order not found in database.");
      }

      const order = orderResult.data;
      console.log("Found order:", order);

      // Check if order is already completed
      if (order.status === "completed" || order.status === "claimed") {
        throw new Error(
          `Order ${orderNumber} has already been claimed on ${
            order.claimed_date
              ? new Date(order.claimed_date).toLocaleDateString()
              : "a previous date"
          }.`
        );
      }

      // Step 3: Update order status to "completed"
      const statusResponse = await fetch(
        `${API_BASE_URL}/orders/${order.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Failed to update order status: ${statusResponse.statusText}`
        );
      }

      const statusResult = await statusResponse.json();
      if (!statusResult.success) {
        throw new Error(
          statusResult.message || "Failed to update order status"
        );
      }

      console.log("Order status updated to completed:", statusResult.data);

      // Step 4: Reduce inventory for all items in the order
      const inventoryUpdates = [];
      const items = order.items || [];

      for (const item of items) {
        try {
          // Find inventory item by name and education level
          const inventoryResponse = await fetch(
            `${API_BASE_URL}/inventory?search=${encodeURIComponent(
              item.name
            )}&education_level=${encodeURIComponent(order.education_level)}`
          );

          if (!inventoryResponse.ok) {
            console.error(`Failed to fetch inventory for ${item.name}`);
            continue;
          }

          const inventoryResult = await inventoryResponse.json();
          if (
            !inventoryResult.success ||
            !inventoryResult.data ||
            inventoryResult.data.length === 0
          ) {
            console.error(`Inventory item not found: ${item.name}`);
            continue;
          }

          // Get the first matching item
          const inventoryItem = inventoryResult.data[0];

          // Reduce stock by the ordered quantity
          const adjustment = -item.quantity; // Negative to reduce stock
          const adjustResponse = await fetch(
            `${API_BASE_URL}/inventory/${inventoryItem.id}/adjust`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                adjustment,
                reason: `Order ${orderNumber} claimed - ${item.quantity}x ${item.name}`,
              }),
            }
          );

          if (!adjustResponse.ok) {
            console.error(
              `Failed to adjust inventory for ${item.name}:`,
              adjustResponse.statusText
            );
            continue;
          }

          const adjustResult = await adjustResponse.json();
          if (adjustResult.success) {
            inventoryUpdates.push({
              item: item.name,
              quantity: item.quantity,
              success: true,
            });
            console.log(
              `Inventory reduced: ${item.name} by ${item.quantity}`,
              adjustResult.data
            );
          }
        } catch (itemError) {
          console.error(`Error processing item ${item.name}:`, itemError);
          inventoryUpdates.push({
            item: item.name,
            quantity: item.quantity,
            success: false,
            error: itemError.message,
          });
        }
      }

      // Success!
      const successMessage = {
        orderNumber: order.order_number,
        studentName: order.student_name,
        items: inventoryUpdates,
        message: `Order ${order.order_number} successfully claimed!`,
      };

      setSuccess(successMessage);
      setProcessing(false);

      return {
        success: true,
        data: successMessage,
      };
    } catch (err) {
      console.error("Error processing scanned order:", err);
      setError(err.message);
      setProcessing(false);
      throw err;
    }
  }, []);

  /**
   * Handle QR code scanned event
   * @param {string} scannedData - Raw QR code data
   */
  const handleQRCodeScanned = useCallback(
    async (scannedData) => {
      console.log("🔍 QR Code Scanned - Starting processing...");
      try {
        const result = await processScannedOrder(scannedData);
        console.log("✅ QR Code Processing Complete:", result);
        return result;
      } catch (err) {
        // Error is already set in processScannedOrder
        console.error("❌ QR scan error:", err);
        throw err;
      }
    },
    [processScannedOrder]
  );

  return {
    qrScannerOpen,
    openQRScanner,
    closeQRScanner,
    handleQRCodeScanned,
    processing,
    error,
    success,
  };
};

export default useOrderQRScanner;
