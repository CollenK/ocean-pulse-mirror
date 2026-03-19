'use client';

import { motion } from 'framer-motion';
import { MPA } from '@/types';
import { Badge, Icon, CircularProgress, getHealthColor } from '@/components/ui';
import { SaveMPAButton } from '@/components/SaveMPAButton';
import { getCountryName } from '@/lib/country-names';
import { HeatwaveAlertBadge } from '@/components/HeatwaveAlert';
import { getMPAImage } from '@/lib/demo/mpa-images';
import type { MarineHeatwaveAlert } from '@/hooks/useHeatwaveAlert';

interface MPAHeroHeaderProps {
  mpa: MPA;
  cached: boolean;
  compositeHealth: {
    score: number;
    loading: boolean;
    confidence: string;
    dataSourcesAvailable: number;
    breakdown: Record<string, unknown>;
    backendAvailable: boolean;
  };
  heatwaveAlert: MarineHeatwaveAlert | null;
}

export function MPAHeroHeader({ mpa, cached, compositeHealth, heatwaveAlert }: MPAHeroHeaderProps) {
  const heroImage = getMPAImage(mpa.id);

  return (
    <div className="relative bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-4 sm:px-6 overflow-hidden">
      {heroImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage.url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          <div className="absolute bottom-2 right-3 text-[10px] text-white/50">
            Photo by{' '}
            <a
              href={`https://unsplash.com/@${heroImage.username}?utm_source=ocean_pulse&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/70"
            >
              {heroImage.credit}
            </a>
            {' '}on{' '}
            <a
              href="https://unsplash.com?utm_source=ocean_pulse&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/70"
            >
              Unsplash
            </a>
          </div>
        </>
      )}
      <div className="relative max-w-screen-xl mx-auto">
        {/* Save button */}
        <div className="flex justify-end mb-4">
          <SaveMPAButton mpaId={mpa.id} mpaDbId={mpa.dbId} variant="icon" size="md" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">{mpa.name}</h1>
            </div>

            {compositeHealth.loading && compositeHealth.score === 0 ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 self-center sm:self-start">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-white/30 border-t-white" />
              </div>
            ) : (
              <div className="flex-shrink-0 self-center sm:self-start">
                <CircularProgress
                  value={compositeHealth.score}
                  size="lg"
                  color={getHealthColor(compositeHealth.score)}
                />
              </div>
            )}
          </div>

          <p className="text-white/80 flex items-center justify-center gap-2 text-2xl sm:text-3xl mb-6">
            <Icon name="marker" size="sm" />
            {getCountryName(mpa.country)} • Est. {mpa.establishedYear}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info" size="md" className="bg-white/20 text-white border-none">
              <Icon name="shield-check" size="sm" />
              {mpa.protectionLevel}
            </Badge>
            {cached && (
              <Badge variant="healthy" size="md" className="bg-white/20 text-white border-none">
                <Icon name="download" size="sm" />
                Cached
              </Badge>
            )}
            {heatwaveAlert && heatwaveAlert.active && (
              <HeatwaveAlertBadge alert={heatwaveAlert} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
