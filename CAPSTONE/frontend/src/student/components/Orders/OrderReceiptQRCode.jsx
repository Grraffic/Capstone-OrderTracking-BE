import QRCode from "react-qr-code";
import { Download, Printer, CheckCircle, Package } from "lucide-react";
import { generateOrderReceiptQRData } from "../../../utils/qrCodeGenerator";

/**
 * OrderReceiptQRCode Component
 *
 * Displays a QR code for a student's order receipt
 * The QR code contains order information that can be scanned by admins
 *
 * Props:
 * - orderData: Object containing order information
 * - showDetails: Boolean to show/hide order details (default: true)
 * - size: QR code size in pixels (default: 256)
 */
const OrderReceiptQRCode = ({ orderData, showDetails = true, size = 256 }) => {
  // Generate QR code data
  const qrData = generateOrderReceiptQRData(orderData);

  // Download QR code as PNG
  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-${orderData.orderNumber}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `order-receipt-${orderData.orderNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // Print QR code
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const qrCodeElement = document.getElementById(
      `qr-code-${orderData.orderNumber}`
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - ${orderData.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .qr-container {
              border: 2px solid #0C2340;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
            }
            .details {
              width: 100%;
              max-width: 400px;
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
            }
            .detail-row {
              display: flex;
              justify-between;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>La Verdad OrderHub</h1>
            <h2>Order Receipt</h2>
          </div>
          <div class="qr-container">
            ${qrCodeElement.outerHTML}
          </div>
          <div class="details">
            <div class="detail-row">
              <span class="label">Order Number:</span>
              <span>${orderData.orderNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">Student:</span>
              <span>${orderData.studentName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span>${new Date(orderData.orderDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total:</span>
              <span>₱${orderData.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h2>
        <p className="text-gray-600 text-sm">
          Your order has been successfully placed
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-gradient-to-br from-[#0C2340] to-[#1e3a8a] p-6 rounded-xl mb-6">
        <div className="bg-white p-4 rounded-lg">
          <QRCode
            id={`qr-code-${orderData.orderNumber}`}
            value={qrData}
            size={size}
            level="H"
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            className="mx-auto"
          />
        </div>
        <p className="text-white text-center text-sm mt-4 font-medium">
          Scan this QR code at the admin office
        </p>
      </div>

      {/* Order Details */}
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-[#0C2340]" />
            <h3 className="font-semibold text-gray-900">Order Details</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-mono font-semibold text-gray-900">
                {orderData.orderNumber}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Student:</span>
              <span className="font-medium text-gray-900">
                {orderData.studentName}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="text-gray-900">
                {new Date(orderData.orderDate).toLocaleDateString()}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600 font-semibold">Total Amount:</span>
              <span className="font-bold text-[#e68b00] text-lg">
                ₱{orderData.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Items List */}
          {orderData.items && orderData.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Items Ordered:
              </p>
              <ul className="space-y-1">
                {orderData.items.map((item, index) => (
                  <li
                    key={index}
                    className="text-xs text-gray-600 flex justify-between"
                  >
                    <span>
                      {item.quantity}x {item.name}
                      {item.size && ` (${item.size})`}
                    </span>
                    <span className="font-medium">
                      ₱{item.price.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0C2340] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors font-medium text-sm"
        >
          <Download size={18} />
          Download
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#0C2340] text-[#0C2340] rounded-lg hover:bg-[#0C2340] hover:text-white transition-colors font-medium text-sm"
        >
          <Printer size={18} />
          Print
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 font-semibold mb-2">
          📱 How to use this receipt:
        </p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Save or print this QR code for your records</li>
          <li>• Present this QR code when claiming your order</li>
          <li>• Admin will scan the code to verify your order</li>
          <li>• Keep this receipt until you receive your items</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderReceiptQRCode;
