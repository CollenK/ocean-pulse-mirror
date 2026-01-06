'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { SavedMPA, MPA } from '@/types/supabase';

interface SavedMPAWithDetails extends SavedMPA {
  mpa?: MPA;
}

export function useSavedMPAs() {
  const { user, isAuthenticated } = useAuth();
  const [savedMPAs, setSavedMPAs] = useState<SavedMPAWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Fetch saved MPAs
  const fetchSavedMPAs = useCallback(async () => {
    if (!user) {
      setSavedMPAs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('saved_mpas')
        .select(`
          *,
          mpa:mpas(*)
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSavedMPAs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch saved MPAs'));
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchSavedMPAs();
  }, [fetchSavedMPAs]);

  // Save an MPA
  const saveMPA = useCallback(async (mpaId: string, notes?: string) => {
    if (!user) {
      return { error: new Error('Must be logged in to save MPAs') };
    }

    try {
      const { error: saveError } = await supabase
        .from('saved_mpas')
        .insert({
          user_id: user.id,
          mpa_id: mpaId,
          notes: notes || null,
        });

      if (saveError) throw saveError;

      // Refresh the list
      await fetchSavedMPAs();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to save MPA') };
    }
  }, [user, supabase, fetchSavedMPAs]);

  // Unsave an MPA
  const unsaveMPA = useCallback(async (mpaId: string) => {
    if (!user) {
      return { error: new Error('Must be logged in') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('saved_mpas')
        .delete()
        .eq('user_id', user.id)
        .eq('mpa_id', mpaId);

      if (deleteError) throw deleteError;

      // Update local state immediately
      setSavedMPAs(prev => prev.filter(s => s.mpa_id !== mpaId));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to unsave MPA') };
    }
  }, [user, supabase]);

  // Check if an MPA is saved
  const isSaved = useCallback((mpaId: string) => {
    return savedMPAs.some(s => s.mpa_id === mpaId);
  }, [savedMPAs]);

  // Toggle save status
  const toggleSave = useCallback(async (mpaId: string) => {
    if (isSaved(mpaId)) {
      return unsaveMPA(mpaId);
    } else {
      return saveMPA(mpaId);
    }
  }, [isSaved, saveMPA, unsaveMPA]);

  return {
    savedMPAs,
    loading,
    error,
    isAuthenticated,
    saveMPA,
    unsaveMPA,
    isSaved,
    toggleSave,
    refetch: fetchSavedMPAs,
  };
}
