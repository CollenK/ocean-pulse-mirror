'use client';

import { useState, useRef, useCallback } from 'react';
import { Button, Card, CardContent } from '@/components/ui';

interface CameraCaptureProps {
  onCapture: (imageData: string, metadata: ImageMetadata) => void;
  onCancel?: () => void;
}

export interface ImageMetadata {
  timestamp: number;
  size: number;
  width: number;
  height: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

type CameraMode = 'idle' | 'camera' | 'preview';

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [mode, setMode] = useState<CameraMode>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Request camera with ideal settings for mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setMode('camera');
    } catch (err: any) {
      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please enable camera access in your device settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setMode('idle');
  }, []);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Stop camera
    stopCamera();
    setMode('preview');
  }, [stopCamera]);

  // Get location for metadata
  const getLocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  // Confirm and return captured image
  const confirmCapture = useCallback(async () => {
    if (!capturedImage) return;

    // Get location data
    const position = await getLocation();

    // Calculate image size
    const sizeInBytes = Math.round((capturedImage.length * 3) / 4);

    // Create temporary image to get dimensions
    const img = new Image();
    img.src = capturedImage;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const metadata: ImageMetadata = {
      timestamp: Date.now(),
      size: sizeInBytes,
      width: img.width,
      height: img.height,
      location: position
        ? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
        : undefined,
    };

    onCapture(capturedImage, metadata);
    reset();
  }, [capturedImage, onCapture]);

  // Retake photo
  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Reset state
  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setMode('idle');
  }, [stopCamera]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    reset();
    onCancel?.();
  }, [reset, onCancel]);

  // Idle state - show capture button
  if (mode === 'idle') {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-navy-600 mb-2">
              Take a Photo
            </h3>
            <p className="text-gray-600 mb-6">
              Capture images of marine life and habitats
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                loading={loading}
                fullWidth
                size="lg"
              >
                {loading ? 'Starting Camera...' : 'Open Camera'}
              </Button>
              {onCancel && (
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  fullWidth
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Camera active - show viewfinder
  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="relative h-full flex flex-col">
          {/* Video viewfinder */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay grid for composition */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full w-full grid grid-cols-3 grid-rows-3 opacity-30">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white" />
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-black/80 p-6 safe-area-bottom">
            <div className="flex items-center justify-center gap-6">
              <Button
                onClick={stopCamera}
                variant="ghost"
                className="text-white border-white"
              >
                Cancel
              </Button>
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 active:scale-95 transition-transform"
                aria-label="Capture photo"
              >
                <div className="w-full h-full rounded-full bg-white" />
              </button>
              <div className="w-20" /> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Preview mode - show captured image
  if (mode === 'preview' && capturedImage) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="relative h-full flex flex-col">
          {/* Preview image */}
          <div className="flex-1 relative overflow-hidden">
            <img
              src={capturedImage}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>

          {/* Controls */}
          <div className="bg-black/80 p-6 safe-area-bottom">
            <div className="space-y-3">
              <Button
                onClick={confirmCapture}
                fullWidth
                size="lg"
              >
                ✓ Use This Photo
              </Button>
              <Button
                onClick={retake}
                variant="secondary"
                fullWidth
              >
                ↻ Retake
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
