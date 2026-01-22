'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { getSpeciesDetailsCached, formatSpeciesName } from '@/lib/species-service';
import { formatTaxonomy, getCommonName, OBISSpecies } from '@/lib/obis-client';

export default function SpeciesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [species, setSpecies] = useState<OBISSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scientificName = decodeURIComponent(params.name as string);

    getSpeciesDetailsCached(scientificName)
      .then((data) => {
        if (data) {
          setSpecies(data);
        } else {
          setError('Species not found');
        }
      })
      .catch(() => setError('Failed to load species data'))
      .finally(() => setLoading(false));
  }, [params.name]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-4">
            <div className="h-10 w-32 bg-balean-gray-200 animate-pulse rounded" />
          </div>
          <MPACardSkeleton />
          <div className="mt-4">
            <MPACardSkeleton />
          </div>
        </div>
      </main>
    );
  }

  if (error || !species) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <Card>
            <CardTitle>Error</CardTitle>
            <CardContent>
              <p className="text-balean-gray-500 mb-4">
                {error || 'Species not found'}
              </p>
              <Button onClick={() => router.back()} variant="secondary">
                ← Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const commonName = getCommonName(species);
  const taxonomy = formatTaxonomy(species);

  return (
    <main className="min-h-screen pb-24 bg-balean-off-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-balean-cyan to-balean-navy text-white p-6 pb-12">
        <div className="max-w-screen-xl mx-auto">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4 text-white border-white hover:bg-white/20"
          >
            ← Back
          </Button>

          <div className="mb-4"><Icon name="fish" className="text-6xl" /></div>

          <h1 className="text-3xl font-bold mb-2">{commonName}</h1>

          {species.vernacularName && (
            <p className="text-lg opacity-90 italic mb-4">
              {species.scientificName}
            </p>
          )}

          {!species.vernacularName && (
            <p className="text-lg opacity-90 mb-4">
              Scientific Name
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {species.taxonRank && (
              <Badge variant="info" size="md">
                {species.taxonRank}
              </Badge>
            )}
            {species.kingdom && (
              <Badge variant="info" size="md">
                {species.kingdom}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-6">
        {/* Taxonomy Card */}
        <Card className="mb-6 shadow-lg">
          <CardTitle>Taxonomy</CardTitle>
          <CardContent>
            <div className="space-y-3">
              {species.kingdom && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Kingdom:</span>
                  <span className="font-semibold">{species.kingdom}</span>
                </div>
              )}
              {species.phylum && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Phylum:</span>
                  <span className="font-semibold">{species.phylum}</span>
                </div>
              )}
              {species.class && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Class:</span>
                  <span className="font-semibold">{species.class}</span>
                </div>
              )}
              {species.order && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Order:</span>
                  <span className="font-semibold">{species.order}</span>
                </div>
              )}
              {species.family && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Family:</span>
                  <span className="font-semibold">{species.family}</span>
                </div>
              )}
              {species.genus && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-balean-gray-500">Genus:</span>
                  <span className="font-semibold italic">{species.genus}</span>
                </div>
              )}
              {species.species && (
                <div className="flex justify-between">
                  <span className="text-balean-gray-500">Species:</span>
                  <span className="font-semibold italic">{species.species}</span>
                </div>
              )}
            </div>

            {taxonomy && (
              <div className="mt-4 p-3 bg-balean-cyan/10 rounded-lg">
                <p className="text-sm text-balean-navy">
                  <strong>Classification:</strong> {taxonomy}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Records Card */}
        {species.records !== undefined && species.records > 0 && (
          <Card className="mb-6">
            <CardTitle>Observation Data</CardTitle>
            <CardContent>
              <div className="text-center p-4">
                <p className="text-4xl font-bold text-balean-cyan mb-2">
                  {species.records.toLocaleString()}
                </p>
                <p className="text-balean-gray-500">
                  Recorded Observations in OBIS Database
                </p>
              </div>
              <div className="mt-4 p-4 bg-balean-off-white rounded-lg">
                <p className="text-sm text-balean-gray-600">
                  This species has been observed and documented {species.records.toLocaleString()} times
                  by researchers and citizen scientists around the world, contributing to our
                  understanding of marine biodiversity.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mb-6">
          <CardTitle>About This Species</CardTitle>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-balean-gray-600 mb-2">Data Source</h3>
                <p className="text-sm text-balean-gray-500">
                  Species information provided by the Ocean Biodiversity Information System (OBIS),
                  a global open-access data and information clearing-house on marine biodiversity
                  for science, conservation and sustainable development.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-balean-gray-500">Learn more:</span>
                <a
                  href={`https://obis.org/taxon/${species.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-balean-cyan hover:text-balean-cyan-dark underline"
                >
                  View on OBIS →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardTitle>Actions</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <Button fullWidth variant="secondary" disabled>
                <Icon name="marker" className="mr-2" /> View Distribution Map (Coming Soon)
              </Button>
              <Button fullWidth variant="secondary" disabled>
                <Icon name="chart-line" className="mr-2" /> View Population Trends (Coming Soon)
              </Button>
              <Button fullWidth variant="ghost">
                <Icon name="share" className="mr-2" /> Share Species Info
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
