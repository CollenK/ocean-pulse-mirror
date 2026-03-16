'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVerifications, useSubmitVerification } from '@/hooks/useVerifications';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { ObservationWithProfile } from '@/lib/observations-service';

interface VerificationPanelProps {
  observation: ObservationWithProfile;
  onVerificationComplete?: () => void;
}

type Step = 'question' | 'confidence' | 'submitting' | 'success' | 'error';

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Not very sure',
  2: 'Somewhat sure',
  3: 'Fairly sure',
  4: 'Very sure',
  5: 'Certain',
};

export function VerificationPanel({ observation, onVerificationComplete }: VerificationPanelProps) {
  const { user } = useAuth();
  const { verifications, loading: verificationsLoading, refetch } = useVerifications(observation.id);
  const { submit } = useSubmitVerification();

  const [step, setStep] = useState<Step>('question');
  const [isAgreement, setIsAgreement] = useState<boolean | null>(null);
  const [suggestedSpecies, setSuggestedSpecies] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = user?.id === observation.user_id;
  const hasVerified = verifications.some(v => v.user_id === user?.id);

  const handleAnswer = (agrees: boolean) => {
    setIsAgreement(agrees);
    setStep('confidence');
  };

  const handleSubmit = async () => {
    if (!user?.id || isAgreement === null) return;

    setStep('submitting');
    setErrorMessage('');

    const result = await submit({
      observationId: observation.id,
      userId: user.id,
      speciesName: isAgreement ? observation.species_name : suggestedSpecies || null,
      isAgreement,
      confidence,
      notes: notes || undefined,
    });

    if (result && !result.error) {
      setStep('success');
      await refetch();
      setTimeout(() => {
        onVerificationComplete?.();
      }, 1500);
    } else {
      setErrorMessage(result?.error || 'Something went wrong. Please try again.');
      setStep('error');
    }
  };

  const resetForm = () => {
    setStep('question');
    setIsAgreement(null);
    setSuggestedSpecies('');
    setConfidence(3);
    setNotes('');
    setErrorMessage('');
  };

  // Already verified by this user
  if (hasVerified && step !== 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
          <i className="fi fi-rr-check text-green-600" />
        </div>
        <p className="text-sm font-medium text-gray-700">You have already verified this observation</p>
      </div>
    );
  }

  // Owner can't verify
  if (isOwner) {
    return null;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Sign in to verify observations</p>
      </div>
    );
  }

  // Previous verifications summary (shown on all steps)
  const agreements = verifications.filter(v => v.is_agreement);
  const disagreements = verifications.filter(v => !v.is_agreement);

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {/* Step 1: The question */}
        {step === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">The observer identified this as</p>
              <p className="text-lg font-semibold text-gray-900 italic">
                {observation.species_name || 'Unknown species'}
              </p>
            </div>

            <p className="text-sm font-medium text-gray-700 text-center">
              Based on the photo, do you agree?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAnswer(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                  <i className="fi fi-rr-check text-green-600 text-lg" />
                </div>
                <span className="text-sm font-medium text-gray-700">Yes, I agree</span>
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
                  <i className="fi fi-rr-cross-small text-amber-600 text-lg" />
                </div>
                <span className="text-sm font-medium text-gray-700">No, it&apos;s something else</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Confidence + details */}
        {step === 'confidence' && (
          <motion.div
            key="confidence"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Summary of choice */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isAgreement ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
            }`}>
              <i className={`fi ${isAgreement ? 'fi-rr-check' : 'fi-rr-cross-small'}`} />
              <span className="text-sm font-medium">
                {isAgreement
                  ? `Agreeing: this is ${observation.species_name || 'the identified species'}`
                  : 'Suggesting a different species'
                }
              </span>
              <button
                onClick={resetForm}
                className="ml-auto text-xs underline opacity-60 hover:opacity-100"
              >
                Change
              </button>
            </div>

            {/* Species input for disagreement */}
            {!isAgreement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What species do you think this is?
                </label>
                <input
                  type="text"
                  value={suggestedSpecies}
                  onChange={e => setSuggestedSpecies(e.target.value)}
                  placeholder="e.g. Blue-spotted Stingray"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-balean-cyan focus:border-balean-cyan outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Confidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How confident are you?
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfidence(level)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      confidence === level
                        ? 'bg-balean-cyan text-white shadow-sm'
                        : confidence > level
                          ? 'bg-balean-cyan/10 text-balean-cyan'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">{CONFIDENCE_LABELS[confidence]}</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context, e.g. distinguishing features you noticed..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-balean-cyan focus:border-balean-cyan outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={resetForm}
                className="flex-shrink-0"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isAgreement && !suggestedSpecies.trim()}
                fullWidth
                className={isAgreement ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Submit Verification
              </Button>
            </div>
          </motion.div>
        )}

        {/* Submitting state */}
        {step === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 gap-3"
          >
            <div className="w-10 h-10 border-3 border-balean-cyan border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Submitting your verification...</p>
          </motion.div>
        )}

        {/* Success state */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8 gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <i className="fi fi-rr-check text-green-600 text-xl" />
            </div>
            <p className="font-medium text-gray-900">Verification submitted</p>
            <p className="text-sm text-gray-500 text-center">
              Thank you for helping improve data quality
            </p>
          </motion.div>
        )}

        {/* Error state */}
        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-6 gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <i className="fi fi-rr-exclamation text-red-600 text-xl" />
            </div>
            <p className="font-medium text-gray-900">Could not submit</p>
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            <Button size="sm" variant="secondary" onClick={resetForm}>
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous verifications (shown below main flow) */}
      {!verificationsLoading && verifications.length > 0 && step === 'question' && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Community verifications ({verifications.length})
          </p>
          <div className="space-y-1.5">
            {verifications.map(v => (
              <div
                key={v.id}
                className="flex items-center gap-2 text-sm"
              >
                <i className={`fi text-xs ${v.is_agreement ? 'fi-rr-check text-green-500' : 'fi-rr-cross-small text-amber-500'}`} />
                <span className="text-gray-600 truncate">
                  {v.profiles?.display_name || 'Anonymous'}
                </span>
                {v.profiles?.is_expert && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                    Expert
                  </span>
                )}
                {!v.is_agreement && v.species_name && (
                  <span className="text-gray-400 truncate">
                    says <span className="italic">{v.species_name}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
