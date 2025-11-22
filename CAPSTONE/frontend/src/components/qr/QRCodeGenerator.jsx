import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Download, Copy, RefreshCw } from 'lucide-react';

const QRCodeGenerator = ({ 
  data, 
  title = "QR Code", 
  size = 256, 
  showControls = true,
  onGenerate = null 
}) => {
  const [qrValue, setQrValue] = useState(data || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data) {
      setQrValue(data);
    }
  }, [data]);

  const generateQRCode = () => {
    if (onGenerate) {
      const newData = onGenerate();
      setQrValue(newData);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-code-${title.replace(/\s+/g, '-')}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-')}-qr-code.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!qrValue) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gray-400 rounded-full flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-white" />
          </div>
          <p className="mt-2 text-sm text-gray-600">No data to generate QR code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        
        <div className="inline-block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <QRCode
            id={`qr-code-${title.replace(/\s+/g, '-')}`}
            value={qrValue}
            size={size}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>

        {showControls && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={copyToClipboard}
                className="btn-outline px-4 py-2 flex items-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>{copied ? 'Copied!' : 'Copy Data'}</span>
              </button>
              
              <button
                onClick={downloadQRCode}
                className="btn-primary px-4 py-2 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>

              {onGenerate && (
                <button
                  onClick={generateQRCode}
                  className="btn-secondary px-4 py-2 flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 max-w-md mx-auto break-all">
              <strong>Data:</strong> {qrValue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized QR Code components for different use cases

export const InventoryQRCode = ({ itemId, itemName, category }) => {
  const qrData = JSON.stringify({
    type: 'inventory',
    itemId,
    itemName,
    category,
    timestamp: new Date().toISOString()
  });

  return (
    <QRCodeGenerator
      data={qrData}
      title={`${itemName} - Inventory QR`}
      size={200}
    />
  );
};

export const OrderQRCode = ({ orderId, studentId, orderType }) => {
  const qrData = JSON.stringify({
    type: 'order',
    orderId,
    studentId,
    orderType,
    timestamp: new Date().toISOString()
  });

  return (
    <QRCodeGenerator
      data={qrData}
      title={`Order #${orderId}`}
      size={200}
    />
  );
};

export const PaymentQRCode = ({ paymentId, amount, description }) => {
  const qrData = JSON.stringify({
    type: 'payment',
    paymentId,
    amount,
    description,
    timestamp: new Date().toISOString()
  });

  return (
    <QRCodeGenerator
      data={qrData}
      title="Payment Verification"
      size={200}
    />
  );
};

export default QRCodeGenerator;
