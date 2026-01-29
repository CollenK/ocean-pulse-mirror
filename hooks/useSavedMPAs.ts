'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from './useAuth';
import type { SavedMPA, MPA, Database } from '@/types/supabase';

interface SavedMPAWithDetails extends SavedMPA {
  mpa?: MPA;
}

export function useSavedMPAs() {
  const { user, isAuthenticated } = useAuth();
  const [savedMPAs, setSavedMPAs] = useState<SavedMPAWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create Supabase client safely
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient<Database>(url, key);
  }, []);

  // Fetch saved MPAs
  const fetchSavedMPAs = useCallback(async () => {
    if (!user || !supabase) {
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

      if (fetchError) {
        // Silently fail if table doesn't exist yet
        if (fetchError.message?.includes('does not exist')) {
          setSavedMPAs([]);
          return;
        }
        throw fetchError;
      }

      setSavedMPAs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch saved MPAs'));
      setSavedMPAs([]);
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
    if (!user || !supabase) {
      return { error: new Error('Must be logged in to save MPAs') };
    }

    try {
      const client = supabase as any;
      const { error: saveError } = await client
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
    if (!user || !supabase) {
      return { error: new Error('Must be logged in') };
    }

    try {
      const client = supabase as any;
      const { error: deleteError } = await client
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

  // Get array of saved MPA IDs (memoized to prevent re-render loops)
  const savedMPAIds = useMemo(() => savedMPAs.map(s => s.mpa_id), [savedMPAs]);

  return {
    savedMPAs,
    savedMPAIds,
    loading,
    error,
    isAuthenticated,
    saveMPA,
    unsaveMPA,
    removeSave: unsaveMPA, // Alias for removeSave
    isSaved,
    toggleSave,
    refetch: fetchSavedMPAs,
  };
}
