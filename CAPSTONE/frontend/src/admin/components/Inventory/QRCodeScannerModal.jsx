import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import QrScanner from "qr-scanner";

/**
 * QRCodeScannerModal Component
 *
 * Enhanced modal for scanning QR codes using device camera
 * Supports scanning both inventory items and student order receipts
 *
 * Props:
 * - isOpen: Boolean indicating if modal is open
 * - onClose: Function to close modal
 * - onScan: Function called when QR code is scanned (receives scanned data)
 * - processing: Boolean indicating if the scanned data is being processed
 */
const QRCodeScannerModal = ({
  isOpen,
  onClose,
  onScan,
  processing = false,
}) => {
  const videoRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [manualTestData, setManualTestData] = useState("");

  // Parse QR code data to check if it's an order receipt
  const parseQRData = (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === "order_receipt" && parsed.orderNumber) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const initScanner = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        setScannedData(null);
        setOrderDetails(null);

        console.log("🎥 Initializing QR Scanner...");
        console.log("📍 Location:", window.location.href);
        console.log("🔒 Protocol:", window.location.protocol);

        // Check camera permissions
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          console.log("✅ Camera access granted");
          stream.getTracks().forEach((track) => track.stop()); // Stop the test stream
        } catch (permError) {
          console.error("❌ Camera permission denied:", permError);
          throw new Error(
            "Camera access denied. Please grant camera permissions and try again."
          );
        }

        const qrScanner = new QrScanner(
          videoRef.current,
          async (result) => {
            // QR code scanned successfully
            const data = result.data;
            console.log("📷 QR Scanner detected code!");
            console.log("📦 Raw QR data:", data);
            console.log("📏 Data length:", data.length);
            setScannedData(data);

            // Check if it's an order receipt QR code
            const orderData = parseQRData(data);
            if (orderData) {
              console.log("✅ Valid order receipt detected!");
              console.log("📋 Order Number:", orderData.orderNumber);
              console.log("👤 Student:", orderData.studentName);
              console.log("📦 Items:", orderData.items?.length || 0);
              setOrderDetails(orderData);
            } else {
              console.log("⚠️ Not an order receipt QR code");
              console.log("🔍 Parsed data:", orderData);
            }

            // Call onScan callback if provided (this triggers order processing)
            if (onScan) {
              console.log("🔄 Calling onScan callback...");
              try {
                await onScan(data);
                console.log("✅ onScan callback completed successfully!");
              } catch (error) {
                console.error("❌ onScan callback error:", error);
                console.error("❌ Error details:", error.message);
              }
            }

            // Don't auto-close - let the parent component handle closing
            // The parent will close after processing is complete
          },
          {
            onDecodeError: (error) => {
              // Silently ignore decode errors
              console.debug("QR decode error:", error);
            },
            preferredCamera: "environment",
            maxScansPerSecond: 5,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        console.log("🔧 QR Scanner instance created");
        setScanner(qrScanner);

        console.log("▶️ Starting QR Scanner...");
        await qrScanner.start();
        console.log("✅ QR Scanner started successfully!");
        console.log("👁️ Scanner is now actively looking for QR codes...");

        setIsScanning(true);
        setIsInitializing(false);
      } catch (err) {
        console.error("❌ Scanner initialization error:", err);
        console.error("❌ Error name:", err.name);
        console.error("❌ Error message:", err.message);
        setError(
          err.message || "Failed to access camera. Please check permissions."
        );
        setIsScanning(false);
        setIsInitializing(false);
      }
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.destroy();
        setScanner(null);
        setIsScanning(false);
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    if (scanner) {
      scanner.destroy();
      setScanner(null);
      setIsScanning(false);
    }
    setScannedData(null);
    setError(null);
    setManualTestData("");
    onClose();
  };

  // Manual test function to simulate QR code scan
  const handleManualTest = async () => {
    if (!manualTestData.trim()) {
      alert("Please paste the QR code data first!");
      return;
    }

    console.log("🧪 Manual Test - Simulating QR scan with pasted data");

    // Simulate the scanner detecting the QR code
    const data = manualTestData.trim();
    console.log("📷 QR Scanner detected code!");
    console.log("📦 Raw QR data:", data);
    console.log("📏 Data length:", data.length);
    setScannedData(data);

    // Check if it's an order receipt QR code
    const orderData = parseQRData(data);
    if (orderData) {
      console.log("✅ Valid order receipt detected!");
      console.log("📋 Order Number:", orderData.orderNumber);
      console.log("👤 Student:", orderData.studentName);
      console.log("📦 Items:", orderData.items?.length || 0);
      setOrderDetails(orderData);
    } else {
      console.log("⚠️ Not an order receipt QR code");
      console.log("🔍 Parsed data:", orderData);
    }

    // Call onScan callback if provided (this triggers order processing)
    if (onScan) {
      console.log("🔄 Calling onScan callback...");
      try {
        await onScan(data);
        console.log("✅ onScan callback completed successfully!");
      } catch (error) {
        console.error("❌ onScan callback error:", error);
        console.error("❌ Error details:", error.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0C2340] to-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <Camera className="text-white" size={24} />
            <h3 className="text-xl font-semibold text-white">Scan QR Code</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Video Stream with Overlay */}
          <div className="mb-6 rounded-xl overflow-hidden bg-black relative">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover"
              style={{ display: isScanning ? "block" : "none" }}
            />

            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-[#e68b00] rounded-lg relative">
                    {/* Corner decorations */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {!isScanning && !error && (
              <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-[#e68b00] animate-spin mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">
                    Initializing camera...
                  </p>
                  <p className="text-gray-400 text-xs mt-1">Please wait</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center px-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-white text-sm font-medium mb-2">
                    Camera Error
                  </p>
                  <p className="text-gray-400 text-xs">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Success Message with Order Details */}
          {scannedData && !orderDetails && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    QR Code Scanned Successfully!
                  </p>
                  <p className="text-xs text-green-700 break-all font-mono bg-green-100 p-2 rounded">
                    {scannedData}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Receipt Details */}
          {orderDetails && (
            <div className="mb-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
                <div>
                  <p className="text-base font-bold text-green-800">
                    Order Receipt Scanned!
                  </p>
                  <p className="text-xs text-green-700">
                    Order details retrieved successfully
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">Order #:</span>
                  <span className="text-gray-900 font-mono">
                    {orderDetails.orderNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">Student:</span>
                  <span className="text-gray-900">
                    {orderDetails.studentName}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">Date:</span>
                  <span className="text-gray-900">
                    {new Date(orderDetails.orderDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">Total:</span>
                  <span className="text-gray-900 font-semibold">
                    ₱{orderDetails.totalAmount.toFixed(2)}
                  </span>
                </div>

                {orderDetails.items && orderDetails.items.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Items:
                    </p>
                    <ul className="space-y-1">
                      {orderDetails.items.map((item, index) => (
                        <li
                          key={index}
                          className="text-xs text-gray-600 flex justify-between"
                        >
                          <span>
                            {item.quantity}x {item.name}
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
            </div>
          )}

          {/* Instructions */}
          {!scannedData && !error && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    How to scan:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Point your camera at the QR code</li>
                    <li>• Keep the code within the orange frame</li>
                    <li>• Hold steady until the code is detected</li>
                    <li>• The scanner will automatically process the code</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="mt-4 text-center">
            {isScanning && !scannedData && !processing && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-600 font-medium">
                  Camera is active - Ready to scan
                </p>
              </div>
            )}
            {processing && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-[#e68b00] animate-spin" />
                <p className="text-sm text-gray-600 font-medium">
                  Processing order...
                </p>
              </div>
            )}
          </div>

          {/* Manual Test Section */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 text-sm">
                  Manual Test Mode
                </h4>
                <p className="text-xs text-yellow-700 mt-1">
                  If the camera can't detect the QR code, paste the QR data here
                  to test the processing flow.
                </p>
              </div>
            </div>
            <textarea
              value={manualTestData}
              onChange={(e) => setManualTestData(e.target.value)}
              placeholder='Paste QR code data here (JSON format: {"type":"order_receipt",...})'
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
              rows={3}
            />
            <button
              onClick={handleManualTest}
              disabled={!manualTestData.trim() || processing}
              className="mt-2 w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              Test with Pasted Data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScannerModal;
