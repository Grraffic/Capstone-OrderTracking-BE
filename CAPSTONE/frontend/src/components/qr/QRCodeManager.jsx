import React, { useState } from 'react';
import QRCodeGenerator from './QRCodeGenerator';
import QRCodeScanner from './QRCodeScanner';
import { QrCode, Camera, History, X } from 'lucide-react';

const QRCodeManager = ({ 
  mode = 'both', // 'scan', 'generate', or 'both'
  onScan,
  onGenerate,
  generatorProps = {},
  scannerProps = {}
}) => {
  const [activeTab, setActiveTab] = useState(mode === 'generate' ? 'generate' : 'scan');
  const [scanHistory, setScanHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleScan = (parsedData, rawData) => {
    const scanResult = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      parsedData,
      rawData,
      type: typeof parsedData === 'object' ? parsedData.type : 'unknown'
    };

    setScanHistory(prev => [scanResult, ...prev.slice(0, 9)]); // Keep last 10 scans
    onScan?.(parsedData, rawData, scanResult);
  };

  const handleScanError = (error) => {
    console.error('QR Scan Error:', error);
  };

  const clearHistory = () => {
    setScanHistory([]);
    setShowHistory(false);
  };

  const formatScanData = (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return data;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'inventory':
        return '📦';
      case 'order':
        return '🛒';
      case 'payment':
        return '💳';
      default:
        return '📄';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tab Navigation */}
      {mode === 'both' && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('scan')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scan'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Scan QR Code
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'generate'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <QrCode className="h-4 w-4 inline mr-2" />
              Generate QR Code
            </button>
          </nav>
        </div>
      )}

      <div className="p-6">
        {/* Scanner Tab */}
        {(activeTab === 'scan' || mode === 'scan') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">QR Code Scanner</h3>
              {scanHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="btn-outline px-3 py-1 text-sm flex items-center space-x-1"
                >
                  <History className="h-4 w-4" />
                  <span>History ({scanHistory.length})</span>
                </button>
              )}
            </div>

            <QRCodeScanner
              onScan={handleScan}
              onError={handleScanError}
              {...scannerProps}
            />

            {/* Scan History */}
            {showHistory && scanHistory.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Recent Scans</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="bg-white rounded p-3 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTypeIcon(scan.type)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {scan.type || 'Unknown'} QR Code
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(scan.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                        {formatScanData(scan.parsedData)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generator Tab */}
        {(activeTab === 'generate' || mode === 'generate') && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">QR Code Generator</h3>
            <QRCodeGenerator
              onGenerate={onGenerate}
              {...generatorProps}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeManager;
