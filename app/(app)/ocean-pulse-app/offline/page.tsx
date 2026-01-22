'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardContent, Button, Badge, HealthBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  getAllCachedMPAs,
  getCachedMPACount,
  getStorageInfo,
  clearAllCache,
  deleteCachedMPA,
  formatBytes,
} from '@/lib/offline-storage';
import { MPA } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();
  const [mpas, setMpas] = useState<MPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState({ usage: 0, quota: 0, percentUsed: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [cachedMPAs, storageInfo] = await Promise.all([
      getAllCachedMPAs(),
      getStorageInfo(),
    ]);
    setMpas(cachedMPAs);
    setStorage(storageInfo);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    await clearAllCache();
    setShowClearConfirm(false);
    loadData();
  };

  const handleDeleteMPA = async (mpaId: string) => {
    await deleteCachedMPA(mpaId);
    loadData();
  };

  return (
    <>
      {/* Clear Cache Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="clear-cache-modal">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-balean-navy mb-2">Clear Cache?</h3>
            <p className="text-balean-gray-500 mb-4">
              Clear all cached data? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmClearAll}
                className="flex-1"
                data-testid="confirm-clear-cache"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            ← Back
          </Button>

          <h1 className="text-3xl font-bold text-balean-navy mb-2 flex items-center gap-2">
            <Icon name="download" size="lg" /> Offline Data
          </h1>
          <p className="text-balean-gray-500">
            Manage cached MPAs for offline access
          </p>
        </div>

        {/* Storage Info */}
        <Card className="mb-6">
          <CardTitle>Storage Usage</CardTitle>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-balean-gray-500">Used:</span>
                <span className="font-semibold">
                  {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                </span>
              </div>
              <div className="w-full bg-balean-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    storage.percentUsed > 80
                      ? 'bg-red-500'
                      : storage.percentUsed > 50
                      ? 'bg-yellow-500'
                      : 'bg-balean-cyan'
                  }`}
                  style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-balean-gray-400 mt-1">
                {storage.percentUsed.toFixed(1)}% used
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-balean-off-white rounded-lg">
                <p className="text-2xl font-bold text-balean-cyan">{mpas.length}</p>
                <p className="text-sm text-balean-gray-500">Cached MPAs</p>
              </div>
              <div className="text-center p-3 bg-balean-off-white rounded-lg">
                <p className="text-2xl font-bold text-balean-navy">
                  {formatBytes(storage.usage)}
                </p>
                <p className="text-sm text-balean-gray-500">Data Stored</p>
              </div>
            </div>

            <Button
              fullWidth
              variant="danger"
              onClick={handleClearAll}
              disabled={mpas.length === 0}
            >
              Clear All Cache
            </Button>
          </CardContent>
        </Card>

        {/* Cached MPAs List */}
        <Card>
          <CardTitle>Cached MPAs ({mpas.length})</CardTitle>
          <CardContent>
            {loading ? (
              <p className="text-center text-balean-gray-400 py-8">Loading...</p>
            ) : mpas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-balean-gray-400 mb-4">
                  No MPAs cached yet
                </p>
                <Link href="/ocean-pulse-app">
                  <Button>Browse MPAs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {mpas.map((mpa) => (
                  <div
                    key={mpa.id}
                    className="p-4 bg-balean-off-white rounded-lg flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <Link
                        href={`/ocean-pulse-app/mpa/${mpa.id}`}
                        className="font-semibold text-balean-navy hover:text-balean-cyan transition-colors"
                      >
                        {mpa.name}
                      </Link>
                      <p className="text-sm text-balean-gray-500 mb-2">{mpa.country}</p>
                      <div className="flex gap-2">
                        <HealthBadge score={mpa.healthScore} size="sm" />
                        <Badge variant="info" size="sm">
                          {mpa.speciesCount} species
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMPA(mpa.id)}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardTitle>About Offline Data</CardTitle>
          <CardContent>
            <div className="space-y-2 text-sm text-balean-gray-600">
              <p>
                ✓ MPAs are automatically cached when you view them
              </p>
              <p>
                ✓ Cached data works without an internet connection
              </p>
              <p>
                ✓ Data syncs automatically when you're back online
              </p>
              <p>
                ✓ Observations made offline are saved and synced later
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
    </>
  );
}
