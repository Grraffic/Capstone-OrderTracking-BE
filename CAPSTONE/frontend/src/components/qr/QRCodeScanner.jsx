import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, CameraOff, RotateCcw, Zap } from 'lucide-react';

const QRCodeScanner = ({ 
  onScan, 
  onError, 
  isActive = true, 
  preferredCamera = 'environment' 
}) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [flashEnabled, setFlashEnabled] = useState(false);

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);

        if (!hasCamera) {
          onError?.('No camera found on this device');
          return;
        }

        // Get available cameras
        const cameras = await QrScanner.listCameras(true);
        setCameras(cameras);

        // Select preferred camera
        const preferredCam = cameras.find(cam => 
          cam.label.toLowerCase().includes(preferredCamera)
        ) || cameras[0];
        setSelectedCamera(preferredCam);

        // Initialize scanner
        if (videoRef.current) {
          scannerRef.current = new QrScanner(
            videoRef.current,
            (result) => {
              try {
                // Try to parse as JSON first
                const parsedData = JSON.parse(result.data);
                onScan?.(parsedData, result.data);
              } catch {
                // If not JSON, return raw data
                onScan?.(result.data, result.data);
              }
            },
            {
              onDecodeError: (error) => {
                // Silently handle decode errors (normal when no QR code is visible)
                console.debug('QR decode error:', error);
              },
              preferredCamera: preferredCam?.id,
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          );
        }
      } catch (error) {
        console.error('Failed to initialize QR scanner:', error);
        onError?.('Failed to initialize camera');
      }
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, [onScan, onError, preferredCamera]);

  useEffect(() => {
    if (scannerRef.current && hasCamera) {
      if (isActive && !isScanning) {
        startScanning();
      } else if (!isActive && isScanning) {
        stopScanning();
      }
    }
  }, [isActive, hasCamera]);

  const startScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.start();
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Failed to start scanning:', error);
      onError?.('Failed to start camera');
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    const currentIndex = cameras.findIndex(cam => cam.id === selectedCamera?.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    setSelectedCamera(nextCamera);

    if (scannerRef.current) {
      await scannerRef.current.setCamera(nextCamera.id);
    }
  };

  const toggleFlash = async () => {
    if (scannerRef.current) {
      try {
        if (flashEnabled) {
          await scannerRef.current.turnFlashOff();
        } else {
          await scannerRef.current.turnFlashOn();
        }
        setFlashEnabled(!flashEnabled);
      } catch (error) {
        console.error('Flash not supported:', error);
      }
    }
  };

  if (!hasCamera) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <CameraOff className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">No camera available</p>
          <p className="text-xs text-gray-500">Please check camera permissions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-64 object-cover"
        playsInline
        muted
      />
      
      {/* Scanner overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-48 h-48 border-2 border-white rounded-lg relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
            title="Switch Camera"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
        
        <button
          onClick={toggleFlash}
          className={`bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors ${
            flashEnabled ? 'bg-yellow-500 bg-opacity-70' : ''
          }`}
          title="Toggle Flash"
        >
          <Zap className="h-5 w-5" />
        </button>

        <button
          onClick={isScanning ? stopScanning : startScanning}
          className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors"
          title={isScanning ? 'Stop Scanning' : 'Start Scanning'}
        >
          {isScanning ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isScanning 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-500 text-white'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isScanning ? 'bg-white animate-pulse' : 'bg-gray-300'
          }`}></div>
          <span>{isScanning ? 'Scanning...' : 'Stopped'}</span>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
