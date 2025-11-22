import { useState, useCallback } from "react";

/**
 * useQRScanner Hook
 *
 * Manages QR scanner modal state and handles scanned data:
 * - QR scanner modal open/close state
 * - Functions to open and close the scanner
 * - Callback to handle scanned QR code data
 *
 * @param {Function} onScan - Callback function to handle scanned data
 * @returns {Object} Object containing qrScannerOpen state, openQRScanner, closeQRScanner, and handleQRCodeScanned functions
 *
 * Usage:
 * const { qrScannerOpen, openQRScanner, closeQRScanner, handleQRCodeScanned } = useQRScanner(setSearchTerm);
 */
export const useQRScanner = (onScan) => {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const openQRScanner = useCallback(() => {
    setQrScannerOpen(true);
  }, []);

  const closeQRScanner = useCallback(() => {
    setQrScannerOpen(false);
  }, []);

  const handleQRCodeScanned = useCallback(
    (scannedData) => {
      console.log("QR Code scanned:", scannedData);
      if (onScan) {
        onScan(scannedData);
      }
      closeQRScanner();
    },
    [onScan, closeQRScanner]
  );

  return {
    qrScannerOpen,
    openQRScanner,
    closeQRScanner,
    handleQRCodeScanned,
  };
};

