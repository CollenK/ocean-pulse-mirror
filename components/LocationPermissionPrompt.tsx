'use client';

import { Card, CardTitle, CardContent, Button } from '@/components/ui';
import { PermissionStatus } from '@/hooks/useGeolocation';

interface LocationPermissionPromptProps {
  permission: PermissionStatus;
  error: string | null;
  loading: boolean;
  onRequestPermission: () => void;
}

export function LocationPermissionPrompt({
  permission,
  error,
  loading,
  onRequestPermission,
}: LocationPermissionPromptProps) {
  // Don't show if permission is granted
  if (permission === 'granted') return null;

  // Unsupported browser
  if (permission === 'unsupported') {
    return (
      <Card className="mb-6 bg-red-50 border-red-200">
        <CardTitle className="text-red-700">Location Not Supported</CardTitle>
        <CardContent>
          <p className="text-red-600 mb-4">
            Your browser doesn't support geolocation. Please use a modern browser to access location features.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <CardTitle className="text-yellow-800">Location Access Denied</CardTitle>
        <CardContent>
          <p className="text-yellow-700 mb-4">
            {error || 'Location permission was denied. To use this feature, please enable location access in your device settings.'}
          </p>
          <div className="bg-white p-4 rounded-lg border border-yellow-200">
            <p className="text-sm font-semibold text-gray-800 mb-2">How to enable:</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Open your device Settings</li>
              <li>Find Safari/Chrome in app list</li>
              <li>Enable Location Services</li>
              <li>Return and refresh this page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prompt for permission
  return (
    <Card className="mb-6 bg-cyan-50 border-cyan-200">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">📍</div>
        <CardTitle className="text-cyan-900 mb-2">Enable Location</CardTitle>
        <CardContent>
          <p className="text-cyan-800 mb-6">
            Find marine protected areas near you by enabling location access. Your privacy is important - we only use your location to show nearby MPAs.
          </p>
          <Button
            onClick={onRequestPermission}
            loading={loading}
            fullWidth
            size="lg"
          >
            {loading ? 'Getting Location...' : 'Enable Location Access'}
          </Button>
          <p className="text-xs text-cyan-700 mt-4">
            You can change this permission anytime in your device settings
          </p>
        </CardContent>
      </div>
    </Card>
  );
}
