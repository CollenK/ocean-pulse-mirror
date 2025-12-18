'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardContent, Button, Input, Textarea, Badge } from '@/components/ui';
import { CameraCapture, ImageMetadata } from '@/components/CameraCapture';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchAllMPAs } from '@/lib/mpa-service';
import { saveObservation } from '@/lib/offline-storage';
import { MPA } from '@/types';

type ObservationStep = 'photo' | 'species' | 'location' | 'notes' | 'review';

interface ObservationData {
  photo?: string;
  photoMetadata?: ImageMetadata;
  speciesName: string;
  speciesType: string;
  quantity: number;
  mpaId?: string;
  notes: string;
  latitude?: number;
  longitude?: number;
}

export default function ObservePage() {
  const router = useRouter();
  const { position } = useGeolocation({ enableHighAccuracy: true });

  const [step, setStep] = useState<ObservationStep>('photo');
  const [mpas, setMpas] = useState<MPA[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<ObservationData>({
    speciesName: '',
    speciesType: 'fish',
    quantity: 1,
    notes: '',
  });

  useEffect(() => {
    fetchAllMPAs().then(setMpas);
  }, []);

  // Update location from geolocation
  useEffect(() => {
    if (position && !data.latitude) {
      setData(prev => ({
        ...prev,
        latitude: position.latitude,
        longitude: position.longitude,
      }));
    }
  }, [position, data.latitude]);

  const handlePhotoCapture = (imageData: string, metadata: ImageMetadata) => {
    setData(prev => ({
      ...prev,
      photo: imageData,
      photoMetadata: metadata,
      latitude: metadata.location?.latitude || prev.latitude,
      longitude: metadata.location?.longitude || prev.longitude,
    }));
    setStep('species');
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const observation = {
        id: `obs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speciesName: data.speciesName,
        speciesType: data.speciesType,
        quantity: data.quantity,
        mpaId: data.mpaId,
        photo: data.photo,
        photoMetadata: data.photoMetadata,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: Date.now(),
        synced: false,
      };

      await saveObservation(observation);

      // Success! Navigate back
      router.push('/?observation=success');
    } catch (error) {
      console.error('Failed to save observation:', error);
      alert('Failed to save observation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = {
    photo: 20,
    species: 40,
    location: 60,
    notes: 80,
    review: 100,
  }[step];

  return (
    <main className="min-h-screen pb-24 bg-gray-50">
      {/* Progress Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="h-1 bg-gray-200">
          <div
            className="h-1 bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-navy-600">
              Add Observation
            </h1>
            <Badge variant="info" size="sm">
              Step {['photo', 'species', 'location', 'notes', 'review'].indexOf(step) + 1}/5
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-6">
        {/* Step 1: Photo Capture */}
        {step === 'photo' && (
          <div>
            <CameraCapture
              onCapture={handlePhotoCapture}
              onCancel={() => router.back()}
            />
          </div>
        )}

        {/* Step 2: Species Information */}
        {step === 'species' && (
          <div className="space-y-4">
            <Card>
              <CardTitle>Species Information</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Species Name *
                    </label>
                    <Input
                      value={data.speciesName}
                      onChange={(e) => setData(prev => ({ ...prev, speciesName: e.target.value }))}
                      placeholder="e.g., Green Sea Turtle, Clownfish"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Species Type *
                    </label>
                    <select
                      value={data.speciesType}
                      onChange={(e) => setData(prev => ({ ...prev, speciesType: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="fish">Fish</option>
                      <option value="mammal">Mammal</option>
                      <option value="reptile">Reptile (Turtle, Sea Snake)</option>
                      <option value="invertebrate">Invertebrate (Coral, Jellyfish)</option>
                      <option value="bird">Seabird</option>
                      <option value="plant">Marine Plant/Algae</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantity Observed
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={data.quantity}
                      onChange={(e) => setData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.photo && (
              <Card>
                <CardTitle>Captured Photo</CardTitle>
                <CardContent>
                  <img
                    src={data.photo}
                    alt="Captured observation"
                    className="w-full rounded-lg"
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('photo')}
                fullWidth
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep('location')}
                disabled={!data.speciesName}
                fullWidth
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 'location' && (
          <div className="space-y-4">
            <Card>
              <CardTitle>Location Details</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Marine Protected Area (Optional)
                    </label>
                    <select
                      value={data.mpaId || ''}
                      onChange={(e) => setData(prev => ({ ...prev, mpaId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Select MPA (if applicable)</option>
                      {mpas.map(mpa => (
                        <option key={mpa.id} value={mpa.id}>
                          {mpa.name} - {mpa.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {data.latitude && data.longitude && (
                    <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-sm font-semibold text-cyan-900 mb-2">
                        📍 GPS Coordinates
                      </p>
                      <div className="text-sm text-cyan-800 space-y-1">
                        <p>Lat: {data.latitude.toFixed(6)}°</p>
                        <p>Lon: {data.longitude.toFixed(6)}°</p>
                        {data.photoMetadata?.location && (
                          <p className="text-xs mt-2">
                            Accuracy: ±{data.photoMetadata.location.accuracy.toFixed(0)}m
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!data.latitude && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ No location data available. Enable location services for better tracking.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('species')}
                fullWidth
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep('notes')}
                fullWidth
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Notes */}
        {step === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardTitle>Additional Notes</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observation Notes (Optional)
                    </label>
                    <Textarea
                      value={data.notes}
                      onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Describe the habitat, behavior, or any interesting details about your observation..."
                      rows={6}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Include details like water conditions, depth, behavior, or surrounding habitat
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('location')}
                fullWidth
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep('review')}
                fullWidth
              >
                Review →
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 'review' && (
          <div className="space-y-4">
            <Card>
              <CardTitle>Review Observation</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  {data.photo && (
                    <div>
                      <img
                        src={data.photo}
                        alt="Observation"
                        className="w-full rounded-lg mb-2"
                      />
                      {data.photoMetadata && (
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{data.photoMetadata.width}×{data.photoMetadata.height}</span>
                          <span>•</span>
                          <span>{(data.photoMetadata.size / 1024).toFixed(0)} KB</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Species:</span>
                      <span className="font-semibold">{data.speciesName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="capitalize">{data.speciesType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span>{data.quantity}</span>
                    </div>
                    {data.mpaId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">MPA:</span>
                        <span className="text-sm">
                          {mpas.find(m => m.id === data.mpaId)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    {data.latitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-mono text-xs">
                          {data.latitude.toFixed(4)}°, {data.longitude?.toFixed(4)}°
                        </span>
                      </div>
                    )}
                    {data.notes && (
                      <div className="pt-3 border-t">
                        <p className="text-gray-600 mb-2">Notes:</p>
                        <p className="text-sm text-gray-800">{data.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <p className="text-sm text-cyan-800">
                💾 Your observation will be saved locally and synced when you're online.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('notes')}
                fullWidth
                disabled={submitting}
              >
                ← Back
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitting}
                fullWidth
                size="lg"
              >
                {submitting ? 'Saving...' : '✓ Submit Observation'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
