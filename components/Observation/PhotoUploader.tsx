'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
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

async function getPhotoLocation(): Promise<PhotoMetadata['location'] | undefined> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
  } catch {
    return undefined;
  }
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Camera access denied. Please enable camera permissions in your device settings.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No camera found on this device.';
  }
  return 'Failed to access camera. Please try again or upload a photo instead.';
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = dataUrl; });
  return { width: img.width, height: img.height };
}

function PhotoDisplay({ value, metadata, disabled, onClear }: {
  value: string; metadata?: PhotoMetadata; disabled: boolean; onClear: () => void;
}) {
  return (
    <div className="relative">
      <img src={value} alt="Captured photo" className="w-full rounded-lg border border-gray-200" />
      {metadata && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
          <span>{metadata.width}&times;{metadata.height}</span>
          <span>&bull;</span>
          <span>{(metadata.size / 1024).toFixed(0)} KB</span>
          {metadata.location && (
            <>
              <span>&bull;</span>
              <span className="text-cyan-600 flex items-center gap-1"><Icon name="marker" size="sm" /> GPS tagged</span>
            </>
          )}
        </div>
      )}
      <Button variant="secondary" onClick={onClear} disabled={disabled} className="mt-3" fullWidth>Remove Photo</Button>
    </div>
  );
}

function CameraView({ videoRef, isProcessing, onCancel, onCapture }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isProcessing: boolean;
  onCancel: () => void;
  onCapture: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isProcessing} fullWidth>Cancel</Button>
        <Button onClick={onCapture} loading={isProcessing} disabled={isProcessing} fullWidth>Capture</Button>
      </div>
    </div>
  );
}

function CaptureOptions({ disabled, cameraError, isProcessing, isMobile, cameraPermission, onTakePhoto, onSelectFile }: {
  disabled: boolean; cameraError: string | null; isProcessing: boolean;
  isMobile: boolean; cameraPermission: CameraPermission;
  onTakePhoto: () => void; onSelectFile: () => void;
}) {
  const cameraDisabled = !isMobile && cameraPermission === 'denied';
  return (
    <div className="space-y-3">
      {cameraError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{cameraError}</p>
        </div>
      )}
      {isProcessing && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Processing image...</p>
        </div>
      )}
      {!isProcessing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onTakePhoto}
            disabled={disabled || cameraDisabled}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all ${
              cameraDisabled
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                : 'border-cyan-300 bg-cyan-50 hover:border-cyan-400 hover:bg-cyan-100'
            }`}
          >
            <Icon name="camera" className="text-3xl text-cyan-600 mb-2" />
            <span className="font-medium text-gray-700">Use Camera</span>
            <span className="text-xs text-gray-500 mt-1">{cameraDisabled ? 'Permission denied' : 'Take a new photo'}</span>
          </button>
          <button
            type="button"
            onClick={onSelectFile}
            disabled={disabled}
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all"
          >
            <Icon name="picture" className="text-3xl text-gray-500 mb-2" />
            <span className="font-medium text-gray-700">Attach Image</span>
            <span className="text-xs text-gray-500 mt-1">From photo library</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function PhotoUploader({
  value, metadata, onChange, disabled = false, maxSizeMB = 10,
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;
    setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase()));
  }, []);

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      setStream(mediaStream);
      setCameraPermission('granted');
      trackPermissionRequest('camera', true);
      if (videoRef.current) { videoRef.current.srcObject = mediaStream; await videoRef.current.play(); }
      setMode('camera');
    } catch (error: unknown) {
      console.error('Camera access error:', error);
      setCameraPermission('denied');
      trackPermissionRequest('camera', false);
      setCameraError(getCameraErrorMessage(error));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    if (videoRef.current) videoRef.current.srcObject = null;
    setMode('none');
    setCameraError(null);
  }, [stream]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const locationData = await getPhotoLocation();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const size = Math.ceil((dataUrl.split(',')[1].length * 3) / 4);
      onChange(dataUrl, { timestamp: Date.now(), size, width: canvas.width, height: canvas.height, type: 'image/jpeg', name: `photo_${Date.now()}.jpg`, location: locationData });
      stopCamera();
    } catch (error) {
      console.error('Failed to capture photo:', error);
      setCameraError('Failed to capture photo. Please try again.');
    } finally { setIsProcessing(false); }
  }, [onChange, stopCamera]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setCameraError('Please select an image file.'); return; }
    if (file.size / (1024 * 1024) > maxSizeMB) { setCameraError(`File too large. Maximum size is ${maxSizeMB}MB.`); return; }
    setIsProcessing(true);
    setCameraError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await getImageDimensions(dataUrl);
      onChange(dataUrl, { timestamp: file.lastModified || Date.now(), size: file.size, width: dims.width, height: dims.height, type: file.type, name: file.name });
      setMode('none');
    } catch (error) {
      console.error('Failed to process file:', error);
      setCameraError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }, [maxSizeMB, onChange]);

  const handleTakePhoto = () => {
    if (isMobile) cameraInputRef.current?.click();
    else startCamera();
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={disabled} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" disabled={disabled} />
      <canvas ref={canvasRef} className="hidden" />

      {value && <PhotoDisplay value={value} metadata={metadata} disabled={disabled} onClear={() => { onChange(null, null); setMode('none'); setCameraError(null); }} />}
      {mode === 'camera' && !value && <CameraView videoRef={videoRef} isProcessing={isProcessing} onCancel={stopCamera} onCapture={capturePhoto} />}
      {!value && mode !== 'camera' && (
        <CaptureOptions
          disabled={disabled} cameraError={cameraError} isProcessing={isProcessing}
          isMobile={isMobile} cameraPermission={cameraPermission}
          onTakePhoto={handleTakePhoto} onSelectFile={() => fileInputRef.current?.click()}
        />
      )}
    </div>
  );
}
