'use client';

import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { ReportTypeSelector } from './ReportTypeSelector';
import { updateObservation, type UpdateObservationInput } from '@/lib/observations-service';
import type { ObservationWithProfile } from '@/lib/observations-service';
import type { ReportType } from '@/types';

interface EditObservationModalProps {
  observation: ObservationWithProfile;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditObservationModal({
  observation,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: EditObservationModalProps) {
  const [reportType, setReportType] = useState<ReportType>(observation.report_type);
  const [speciesName, setSpeciesName] = useState(observation.species_name || '');
  const [quantity, setQuantity] = useState(observation.quantity?.toString() || '');
  const [notes, setNotes] = useState(observation.notes || '');
  const [healthScore, setHealthScore] = useState(
    observation.health_score_assessment?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const input: UpdateObservationInput = {
      id: observation.id,
      userId,
      reportType,
      speciesName: speciesName || undefined,
      quantity: quantity ? parseInt(quantity, 10) : undefined,
      notes: notes || undefined,
      healthScoreAssessment: healthScore ? parseFloat(healthScore) : undefined,
    };

    const result = await updateObservation(input);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to update observation');
    }

    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Observation" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Report Type
          </label>
          <ReportTypeSelector
            value={reportType}
            onChange={setReportType}
            disabled={loading}
          />
        </div>

        {/* Species Name (for species sightings) */}
        {reportType === 'species_sighting' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Species Name
            </label>
            <Input
              type="text"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              placeholder="e.g., Bottlenose Dolphin"
              disabled={loading}
            />
          </div>
        )}

        {/* Quantity */}
        {reportType === 'species_sighting' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quantity (optional)
            </label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Number observed"
              min="1"
              disabled={loading}
            />
          </div>
        )}

        {/* Health Score */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Health Assessment (1-10, optional)
          </label>
          <Input
            type="number"
            value={healthScore}
            onChange={(e) => setHealthScore(e.target.value)}
            placeholder="Rate the overall health 1-10"
            min="1"
            max="10"
            step="0.1"
            disabled={loading}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you observed..."
            rows={4}
            disabled={loading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            fullWidth
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={loading} fullWidth>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
