'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { getSpeciesDetailsCached } from '@/lib/species-service';
import { formatTaxonomy, getCommonName, OBISSpecies } from '@/lib/obis-client';

const TAXONOMY_RANKS: ReadonlyArray<{ key: string; label: string; italic?: boolean }> = [
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'phylum', label: 'Phylum' },
  { key: 'class', label: 'Class' },
  { key: 'order', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'genus', label: 'Genus', italic: true },
  { key: 'species', label: 'Species', italic: true },
];

function SpeciesHeroHeader({ species, onBack }: { species: OBISSpecies; onBack: () => void }) {
  const commonName = getCommonName(species);
  return (
    <div className="bg-gradient-to-br from-balean-cyan to-balean-navy text-white p-6 pb-12">
      <div className="max-w-screen-xl mx-auto">
        <Button onClick={onBack} variant="ghost" size="sm" className="mb-4 text-white border-white hover:bg-white/20">
          &#8592; Back
        </Button>
        <div className="mb-4"><Icon name="fish" className="text-6xl" /></div>
        <h1 className="text-3xl font-bold mb-2">{commonName}</h1>
        <p className="text-lg opacity-90 mb-4" style={species.vernacularName ? { fontStyle: 'italic' } : undefined}>
          {species.vernacularName ? species.scientificName : 'Scientific Name'}
        </p>
        <div className="flex flex-wrap gap-2">
          {species.taxonRank && <Badge variant="info" size="md">{species.taxonRank}</Badge>}
          {species.kingdom && <Badge variant="info" size="md">{species.kingdom}</Badge>}
        </div>
      </div>
    </div>
  );
}

function TaxonomyCard({ species }: { species: OBISSpecies }) {
  const taxonomy = formatTaxonomy(species);
  return (
    <Card className="mb-6 shadow-lg">
      <CardTitle>Taxonomy</CardTitle>
      <CardContent>
        <div className="space-y-3">
          {TAXONOMY_RANKS.map(({ key, label, italic }, i) => {
            const value = species[key as keyof OBISSpecies] as string | undefined;
            if (!value) return null;
            const isLast = i === TAXONOMY_RANKS.length - 1 || !TAXONOMY_RANKS.slice(i + 1).some(r => species[r.key as keyof OBISSpecies]);
            return (
              <div key={key} className={`flex justify-between ${isLast ? '' : 'border-b pb-2'}`}>
                <span className="text-balean-gray-500">{label}:</span>
                <span className={`font-semibold ${italic ? 'italic' : ''}`}>{value}</span>
              </div>
            );
          })}
        </div>
        {taxonomy && (
          <div className="mt-4 p-3 bg-balean-cyan/10 rounded-lg">
            <p className="text-sm text-balean-navy"><strong>Classification:</strong> {taxonomy}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordsCard({ records }: { records: number }) {
  return (
    <Card className="mb-6">
      <CardTitle>Observation Data</CardTitle>
      <CardContent>
        <div className="text-center p-4">
          <p className="text-4xl font-bold text-balean-cyan mb-2">{records.toLocaleString()}</p>
          <p className="text-balean-gray-500">Recorded Observations in OBIS Database</p>
        </div>
        <div className="mt-4 p-4 bg-balean-off-white rounded-lg">
          <p className="text-sm text-balean-gray-600">
            This species has been observed and documented {records.toLocaleString()} times
            by researchers and citizen scientists around the world, contributing to our
            understanding of marine biodiversity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SpeciesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [species, setSpecies] = useState<OBISSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scientificName = decodeURIComponent(params.name as string);
    getSpeciesDetailsCached(scientificName)
      .then((data) => { if (data) setSpecies(data); else setError('Species not found'); })
      .catch(() => setError('Failed to load species data'))
      .finally(() => setLoading(false));
  }, [params.name]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-4"><div className="h-10 w-32 bg-balean-gray-200 animate-pulse rounded" /></div>
          <MPACardSkeleton /><div className="mt-4"><MPACardSkeleton /></div>
        </div>
      </main>
    );
  }

  if (error || !species) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <Card><CardTitle>Error</CardTitle>
            <CardContent>
              <p className="text-balean-gray-500 mb-4">{error || 'Species not found'}</p>
              <Button onClick={() => router.back()} variant="secondary">&#8592; Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-balean-off-white">
      <SpeciesHeroHeader species={species} onBack={() => router.back()} />
      <div className="max-w-screen-xl mx-auto px-6 -mt-6">
        <TaxonomyCard species={species} />
        {species.records !== undefined && species.records > 0 && <RecordsCard records={species.records} />}
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
                <a href={`https://obis.org/taxon/${species.id}`} target="_blank" rel="noopener noreferrer" className="text-balean-cyan hover:text-balean-cyan-dark underline">
                  View on OBIS &#8594;
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardTitle>Actions</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <Button fullWidth variant="secondary" disabled><Icon name="marker" className="mr-2" /> View Distribution Map (Coming Soon)</Button>
              <Button fullWidth variant="secondary" disabled><Icon name="chart-line" className="mr-2" /> View Population Trends (Coming Soon)</Button>
              <Button fullWidth variant="ghost"><Icon name="share" className="mr-2" /> Share Species Info</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
