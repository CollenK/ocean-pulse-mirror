'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, Button, Input, Textarea, Badge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  HealthScoreSlider,
  MPASearchSelect,
  PhotoUploader,
  ReportTypeSelector,
  PhotoMetadata,
} from '@/components/Observation';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllMPAs } from '@/lib/mpa-service';
import {
  saveDraft,
  deleteDraft,
  getDraft,
} from '@/lib/offline-storage';
import { createObservation, uploadObservationPhoto } from '@/lib/observations-service';
import { MPA, ReportType, REPORT_TYPES } from '@/types';

interface ObservationData {
  reportType?: ReportType;
  photo?: string;
  photoMetadata?: PhotoMetadata;
  speciesName: string;
  speciesType: string;
  quantity: number;
  mpaId?: string;
  notes: string;
  healthScoreAssessment?: number;
}

// Sign-in prompt component for unauthenticated users
function SignInPrompt() {
  const router = useRouter();

  return (
    <main className="min-h-screen pb-24 bg-balean-off-white">
      <div className="sticky top-0 z-40 bg-white border-b border-balean-gray-200">
        <div className="p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-balean-navy">Submit New Report</h1>
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-balean-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl text-balean-gray-400">×</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent>
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto bg-balean-cyan/20 rounded-full flex items-center justify-center">
                <Icon name="lock" className="text-4xl text-balean-cyan" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-balean-navy">
                  Sign in to add observations
                </h2>
                <p className="text-balean-gray-500 max-w-md mx-auto">
                  You need to be signed in to submit observations. Your contributions help build
                  community-driven health scores for marine protected areas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <Button onClick={() => router.push('/login?redirect=/ocean-pulse-app/observe')} fullWidth>
                  Sign In
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/login?redirect=/ocean-pulse-app/observe&signup=true')}
                  fullWidth
                >
                  Create Account
                </Button>
              </div>

              <button
                onClick={() => router.back()}
                className="text-sm text-balean-gray-400 hover:text-balean-gray-600"
              >
                Go back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// Main form content
function ObservePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [mpas, setMpas] = useState<MPA[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<ObservationData>({
    speciesName: '',
    speciesType: 'fish',
    quantity: 1,
    notes: '',
  });

  // Load MPAs
  useEffect(() => {
    fetchAllMPAs().then(setMpas);
  }, []);

  // Load draft if provided in URL
  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (draftParam) {
      const id = parseInt(draftParam, 10);
      if (!isNaN(id)) {
        loadDraft(id);
      }
    }
  }, [searchParams]);

  // Pre-select MPA if provided in URL
  useEffect(() => {
    const mpaParam = searchParams.get('mpa');
    if (mpaParam && !data.mpaId) {
      setData(prev => ({ ...prev, mpaId: mpaParam }));
    }
  }, [searchParams, data.mpaId]);

  const loadDraft = async (id: number) => {
    try {
      const draft = await getDraft(id);
      if (draft) {
        setDraftId(id);
        setData({
          reportType: draft.reportType,
          photo: draft.photo as string,
          speciesName: draft.speciesName || '',
          speciesType: 'fish',
          quantity: draft.quantity || 1,
          mpaId: draft.mpaId,
          notes: draft.notes,
          healthScoreAssessment: draft.healthScoreAssessment,
        });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const handleReportTypeChange = (type: ReportType) => {
    setData(prev => ({ ...prev, reportType: type }));
    if (errors.reportType) {
      setErrors(prev => ({ ...prev, reportType: '' }));
    }
  };

  const handlePhotoChange = (photo: string | null, metadata: PhotoMetadata | null) => {
    setData(prev => ({
      ...prev,
      photo: photo || undefined,
      photoMetadata: metadata || undefined,
    }));
  };

  const handleHealthScoreChange = (score: number) => {
    setData(prev => ({ ...prev, healthScoreAssessment: score }));
  };

  const handleMpaChange = (mpaId: string) => {
    setData(prev => ({ ...prev, mpaId }));
    if (errors.mpaId) {
      setErrors(prev => ({ ...prev, mpaId: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.reportType) {
      newErrors.reportType = 'Please select a report type';
    }

    if (!data.mpaId) {
      newErrors.mpaId = 'Please select a Marine Protected Area';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!data.reportType) {
      setErrors({ reportType: 'Please select a report type before saving a draft' });
      return;
    }

    setSavingDraft(true);

    try {
      const draftData = {
        reportType: data.reportType,
        photo: data.photo || '',
        mpaId: data.mpaId || '',
        notes: data.notes,
        location: { lat: 0, lng: 0 },
        speciesName: data.speciesName,
        quantity: data.quantity,
        healthScoreAssessment: data.healthScoreAssessment,
        timestamp: Date.now(),
        userId: user?.id,
      };

      if (draftId) {
        const { updateDraft } = await import('@/lib/offline-storage');
        await updateDraft(draftId, draftData);
      } else {
        const newId = await saveDraft(draftData);
        setDraftId(newId);
      }

      // Show success feedback
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('[data-error="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);

    try {
      // Use MPA center as location
      const selectedMPA = mpas.find(m => m.id === data.mpaId);
      const latitude = selectedMPA ? selectedMPA.center[0] : 0;
      const longitude = selectedMPA ? selectedMPA.center[1] : 0;

      // Upload photo to Supabase Storage if present
      let photoUrl: string | undefined;
      if (data.photo && user?.id) {
        const uploadedUrl = await uploadObservationPhoto(data.photo, user.id);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      // Create observation using Supabase service (falls back to IndexedDB if offline)
      const result = await createObservation({
        mpaId: data.mpaId || '',
        reportType: data.reportType!,
        speciesName: data.speciesName || undefined,
        speciesType: data.speciesType || undefined,
        quantity: data.quantity || undefined,
        notes: data.notes || undefined,
        latitude,
        longitude,
        photoUrl: photoUrl || data.photo, // Use uploaded URL or base64 fallback
        healthScoreAssessment: data.healthScoreAssessment,
        userId: user?.id,
      });

      console.log('Observation saved:', result.synced ? 'to Supabase' : 'locally');

      // Delete draft if exists
      if (draftId) {
        await deleteDraft(draftId);
      }

      router.push('/?observation=success');
    } catch (error) {
      console.error('Failed to save observation:', error);
      alert('Failed to save observation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (data.reportType || data.photo || data.notes || data.healthScoreAssessment) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <main className="min-h-screen pb-24 bg-balean-off-white">
        <div className="sticky top-0 z-40 bg-white border-b border-balean-gray-200">
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-xl font-bold text-balean-navy">Submit New Report</h1>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-balean-cyan border-t-transparent" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Auth required
  if (!user) {
    return <SignInPrompt />;
  }

  const reportTypeInfo = data.reportType ? REPORT_TYPES[data.reportType] : null;

  return (
    <main className="min-h-screen pb-24 bg-balean-off-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-balean-gray-200">
        <div className="p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-balean-navy">Submit New Report</h1>
              <p className="text-sm text-balean-gray-400">Help us monitor ocean health by sharing your observations</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-balean-gray-100 rounded-lg transition-colors"
            >
              <span className="text-2xl text-balean-gray-300 hover:text-balean-gray-500">×</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Report Type */}
        <section data-error={!!errors.reportType}>
          <label className="block text-sm font-semibold text-balean-navy mb-3">
            Report Type <span className="text-red-500">*</span>
          </label>
          <ReportTypeSelector
            value={data.reportType}
            onChange={handleReportTypeChange}
          />
          {errors.reportType && (
            <p className="mt-2 text-sm text-red-600">{errors.reportType}</p>
          )}
        </section>

        {/* Location (MPA Selection) */}
        <section data-error={!!errors.mpaId}>
          <label className="block text-sm font-semibold text-balean-navy mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <MPASearchSelect
            mpas={mpas}
            value={data.mpaId}
            onChange={handleMpaChange}
            error={!!errors.mpaId}
          />
          {errors.mpaId ? (
            <p className="mt-2 text-sm text-red-600">{errors.mpaId}</p>
          ) : (
            <p className="mt-2 text-xs text-balean-gray-400">
              Search or select the MPA where you made your observation
            </p>
          )}
        </section>

        {/* Species Info - Only show for species sighting */}
        {data.reportType === 'species_sighting' && (
          <section className="space-y-4 p-4 bg-balean-cyan/10 rounded-xl border border-balean-cyan/20">
            <h3 className="font-semibold text-balean-navy flex items-center gap-2">
              <Icon name="fish" /> Species Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-balean-gray-600 mb-2">
                Species Name
              </label>
              <Input
                value={data.speciesName}
                onChange={(e) => setData(prev => ({ ...prev, speciesName: e.target.value }))}
                placeholder="e.g., Green Sea Turtle, Clownfish"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-balean-gray-600 mb-2">
                  Species Type
                </label>
                <select
                  value={data.speciesType}
                  onChange={(e) => setData(prev => ({ ...prev, speciesType: e.target.value }))}
                  className="w-full px-4 py-2 border border-balean-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-balean-cyan bg-white"
                >
                  <option value="fish">Fish</option>
                  <option value="mammal">Mammal</option>
                  <option value="reptile">Reptile</option>
                  <option value="invertebrate">Invertebrate</option>
                  <option value="bird">Seabird</option>
                  <option value="plant">Marine Plant</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-balean-gray-600 mb-2">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={data.quantity}
                  onChange={(e) => setData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
            </div>
          </section>
        )}

        {/* Description */}
        <section>
          <label className="block text-sm font-semibold text-balean-navy mb-2">
            Description
          </label>
          <Textarea
            value={data.notes}
            onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Describe your observation in detail..."
            rows={4}
            className="resize-y"
          />
        </section>

        {/* Photo Evidence */}
        <section>
          <label className="block text-sm font-semibold text-balean-navy mb-3">
            Photo Evidence
          </label>
          <PhotoUploader
            value={data.photo}
            metadata={data.photoMetadata}
            onChange={handlePhotoChange}
          />
        </section>

        {/* Health Score Assessment */}
        <section>
          <HealthScoreSlider
            value={data.healthScoreAssessment}
            onChange={handleHealthScoreChange}
          />
        </section>

        {/* Sync Notice */}
        <div className="p-4 bg-balean-cyan/10 border border-balean-cyan/20 rounded-xl">
          <p className="text-sm text-balean-navy">
            Your observation will be saved to our database. If you&apos;re offline, it will be stored locally and synced when you reconnect.
            {data.healthScoreAssessment && data.mpaId && (
              <> Your health score will contribute to the MPA&apos;s community rating.</>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || savingDraft}
            fullWidth
            size="lg"
          >
            Submit Report
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={savingDraft}
            disabled={submitting || savingDraft}
            fullWidth
          >
            Save Draft
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={submitting || savingDraft}
            fullWidth
          >
            Cancel
          </Button>
        </div>
      </div>
    </main>
  );
}

// Loading fallback
function ObservePageFallback() {
  return (
    <main className="min-h-screen pb-24 bg-balean-off-white">
      <div className="sticky top-0 z-40 bg-white border-b border-balean-gray-200">
        <div className="p-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-balean-navy">Submit New Report</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-balean-cyan border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// Main page export with Suspense boundary
export default function ObservePage() {
  return (
    <Suspense fallback={<ObservePageFallback />}>
      <ObservePageContent />
    </Suspense>
  );
}
