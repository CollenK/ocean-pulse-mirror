'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import { Card, CardContent, Button, Icon, CircularProgress, getHealthColor } from '@/components/ui';
import { fetchMPAById } from '@/lib/mpa-service';
import { storeAuthRedirect } from '@/lib/auth-redirect';
import type { MPA } from '@/types';

export default function SavedMPAsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { savedMPAIds, loading: savedLoading, removeSave } = useSavedMPAs();
  const [mpas, setMpas] = useState<MPA[]>([]);
  const [loadingMPAs, setLoadingMPAs] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      storeAuthRedirect('/ocean-pulse-app/saved');
      router.push('/login?redirect=/ocean-pulse-app/saved');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load MPA details for saved IDs
  useEffect(() => {
    // Wait until saved MPAs have finished loading
    if (savedLoading) return;

    if (savedMPAIds.length === 0) {
      setMpas([]);
      return;
    }

    let cancelled = false;

    const loadMPAs = async () => {
      setLoadingMPAs(true);
      const loadedMPAs: MPA[] = [];

      for (const id of savedMPAIds) {
        if (cancelled) return;
        const mpa = await fetchMPAById(id);
        if (mpa) {
          loadedMPAs.push(mpa);
        }
      }

      if (!cancelled) {
        setMpas(loadedMPAs);
        setLoadingMPAs(false);
      }
    };

    loadMPAs();

    return () => { cancelled = true; };
  }, [savedMPAIds, savedLoading]);

  const handleRemove = async (mpa: MPA) => {
    // Use the database UUID for the delete operation
    await removeSave(mpa.dbId || mpa.id);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen pb-32">
        <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-6">
          <div className="max-w-screen-xl mx-auto">
            <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon name="heart" className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Saved MPAs</h1>
                <p className="text-white/80">
                  {savedMPAIds.length} {savedMPAIds.length === 1 ? 'area' : 'areas'} saved
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-10">
        {savedLoading || loadingMPAs ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500">Loading saved MPAs...</p>
            </CardContent>
          </Card>
        ) : mpas.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="heart" className="text-balean-gray-300 text-4xl" />
              </div>
              <h2 className="text-xl font-semibold text-balean-navy mb-2">No saved MPAs yet</h2>
              <p className="text-balean-gray-500 mb-6">
                Start exploring and save your favorite marine protected areas
              </p>
              <Link href="/ocean-pulse-app">
                <Button>
                  <Icon name="map" size="sm" />
                  Explore MPAs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {mpas.map((mpa, index) => (
              <motion.div
                key={mpa.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      <Link href={`/ocean-pulse-app/mpa/${mpa.id}`} className="flex-1 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <CircularProgress
                            value={mpa.healthScore}
                            size="lg"
                            color={getHealthColor(mpa.healthScore)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-balean-navy truncate">{mpa.name}</h3>
                          <p className="text-sm text-balean-gray-400 flex items-center gap-1">
                            <Icon name="marker" size="sm" />
                            {mpa.country}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-balean-gray-400">
                            <span className="flex items-center gap-1">
                              <Icon name="fish" size="sm" />
                              {mpa.speciesCount.toLocaleString()} species
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="map" size="sm" />
                              {mpa.area}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleRemove(mpa)}
                        className="p-2 text-balean-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove from saved"
                      >
                        <Icon name="trash" size="md" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
