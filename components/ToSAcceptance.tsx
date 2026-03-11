'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const CURRENT_TOS_VERSION = '1.0';

/**
 * Shows a ToS/Privacy acceptance dialog after first login.
 * Stores acceptance in the profiles.preferences JSONB column.
 * Renders nothing if user has already accepted the current version.
 */
export function ToSAcceptance() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    async function checkAcceptance() {
      const supabase = createClient();
      const { data } = await (supabase.from('profiles') as any)
        .select('preferences')
        .eq('id', user!.id)
        .single() as { data: { preferences: Record<string, unknown> } | null };

      const preferences = data?.preferences || {};
      const acceptedVersion = preferences.tos_accepted_version as string | undefined;

      if (acceptedVersion !== CURRENT_TOS_VERSION) {
        setShowDialog(true);
      }
    }

    checkAcceptance();
  }, [user]);

  const handleAccept = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setAccepting(true);

    try {
      const supabase = createClient();

      // Get current preferences
      const { data } = await (supabase.from('profiles') as any)
        .select('preferences')
        .eq('id', user.id)
        .single() as { data: { preferences: Record<string, unknown> } | null };

      const currentPrefs = data?.preferences || {};

      // Update with ToS acceptance
      await (supabase.from('profiles') as any).update({
        preferences: {
          ...currentPrefs,
          tos_accepted_version: CURRENT_TOS_VERSION,
          tos_accepted_at: new Date().toISOString(),
        },
      }).eq('id', user.id);

      setShowDialog(false);
    } catch (error) {
      console.error('Failed to save ToS acceptance:', error);
    } finally {
      setAccepting(false);
    }
  }, [user]);

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Welcome to Ocean PULSE</h2>
        <p className="text-sm text-gray-600">
          Before continuing, please review and accept our Terms of Service and Privacy Policy.
        </p>
        <div className="text-sm text-gray-500 space-y-2">
          <p>
            By using Ocean PULSE, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline">
              Privacy Policy
            </a>.
          </p>
          <p>
            We collect and process data in accordance with GDPR. You can export or delete your data at any time from your profile settings.
          </p>
        </div>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white font-medium rounded-xl transition-colors"
        >
          {accepting ? 'Saving...' : 'I Accept'}
        </button>
      </div>
    </div>
  );
}
