'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui';
import { trackPermissionRequest } from '@/lib/analytics';

export interface PhotoMetadata {
  timestamp: number;
  size: number;
  width: number;
  height: number;
  type: string;
  name?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface PhotoUploaderProps {
  value?: string;
  metadata?: PhotoMetadata;
  onChange: (photo: string | null, metadata: PhotoMetadata | null) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

type CaptureMode = 'none' | 'camera' | 'upload';
type CameraPermission = 'prompt' | 'granted' | 'denied';

export function PhotoUploader({
  value,
  metadata,
  onChange,
  disabled = false,
  maxSizeMB = 10,
}: PhotoUploaderProps) {
  const [mode, setMode] = useState<CaptureMode>('none');
  const [cameraPermission, setCameraPermission] = useState<CameraPermission>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      setCameraPermission('granted');
      trackPermissionRequest('camera', true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setMode('camera');
    } catch (error: any) {
      console.error('Camera access error:', error);
      setCameraPermission('denied');
      trackPermissionRequest('camera', false);

      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please enable camera permissions in your device settings.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Failed to access camera. Please try again or upload a photo instead.');
      }
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMode('none');
    setCameraError(null);
  }, [stream]);

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get geolocation for photo metadata
      let locationData: PhotoMetadata['location'] | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } catch {
        // Location not available, continue without it
      }

      // Convert to JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Calculate size
      const base64Data = dataUrl.split(',')[1];
      const size = Math.ceil((base64Data.length * 3) / 4);

      const photoMetadata: PhotoMetadata = {
        timestamp: Date.now(),
        size,
        width: canvas.width,
        height: canvas.height,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
        location: locationData,
      };

      onChange(dataUrl, photoMetadata);
      stopCamera();
    } catch (error) {
      console.error('Failed to capture photo:', error);
      setCameraError('Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onChange, stopCamera]);

  // Handle file upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setCameraError('Please select an image file.');
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setCameraError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setIsProcessing(true);
    setCameraError(null);

    try {
      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Get image dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const photoMetadata: PhotoMetadata = {
        timestamp: file.lastModified || Date.now(),
        size: file.size,
        width: img.width,
        height: img.height,
        type: file.type,
        name: file.name,
      };

      onChange(dataUrl, photoMetadata);
      setMode('none');
    } catch (error) {
      console.error('Failed to process file:', error);
      setCameraError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [maxSizeMB, onChange]);

  // Clear photo
  const clearPhoto = useCallback(() => {
    onChange(null, null);
    setMode('none');
    setCameraError(null);
  }, [onChange]);

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        Photo Evidence
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={isMobile ? 'environment' : undefined}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Photo Display */}
      {value && (
        <div className="relative">
          <img
            src={value}
            alt="Captured photo"
            className="w-full rounded-lg border border-gray-200"
          />
          {metadata && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{metadata.width}×{metadata.height}</span>
              <span>•</span>
              <span>{(metadata.size / 1024).toFixed(0)} KB</span>
              {metadata.location && (
                <>
                  <span>•</span>
                  <span className="text-cyan-600">📍 GPS tagged</span>
                </>
              )}
            </div>
          )}
          <Button
            variant="secondary"
            onClick={clearPhoto}
            disabled={disabled}
            className="mt-3"
            fullWidth
          >
            Remove Photo
          </Button>
        </div>
      )}

      {/* Camera View */}
      {mode === 'camera' && !value && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={stopCamera}
              disabled={isProcessing}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={capturePhoto}
              loading={isProcessing}
              disabled={isProcessing}
              fullWidth
            >
              Capture
            </Button>
          </div>
        </div>
      )}

      {/* Upload/Camera Options */}
      {!value && mode !== 'camera' && (
        <div className="space-y-3">
          {/* Error Display */}
          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{cameraError}</p>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
              <p className="text-sm text-gray-600">Processing image...</p>
            </div>
          )}

          {/* Action Buttons */}
          {!isProcessing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Camera Button - Show on all devices but with different behavior */}
              <button
                type="button"
                onClick={startCamera}
                disabled={disabled || cameraPermission === 'denied'}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all ${
                  cameraPermission === 'denied'
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : 'border-cyan-300 bg-cyan-50 hover:border-cyan-400 hover:bg-cyan-100'
                }`}
              >
                <span className="text-3xl mb-2">📷</span>
                <span className="font-medium text-gray-700">Take Photo</span>
                <span className="text-xs text-gray-500 mt-1">
                  {cameraPermission === 'denied' ? 'Permission denied' : 'Use device camera'}
                </span>
              </button>

              {/* Upload Button */}
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={disabled}
                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all"
              >
                <span className="text-3xl mb-2">📁</span>
                <span className="font-medium text-gray-700">Upload Photo</span>
                <span className="text-xs text-gray-500 mt-1">
                  From device storage
                </span>
              </button>
            </div>
          )}

          {/* Mobile Direct Capture */}
          {isMobile && !isProcessing && (
            <p className="text-xs text-gray-500 text-center">
              Tip: &quot;Upload Photo&quot; will also allow you to take a new photo on mobile devices
            </p>
          )}
        </div>
      )}
    </div>
  );
}
