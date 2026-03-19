'use client';

import { motion } from 'framer-motion';
import { MPA } from '@/types';
import { Card, CardContent, Icon, InfoTip } from '@/components/ui';
import { formatArea } from '@/lib/mpa-service';

interface MPAStatsGridProps {
  mpa: MPA;
  compositeHealth: {
    score: number;
    loading: boolean;
    confidence: string;
    dataSourcesAvailable: number;
    breakdown: Record<string, unknown>;
    backendAvailable: boolean;
  };
  onHealthClick: () => void;
}

export function MPAStatsGrid({ mpa, compositeHealth, onHealthClick }: MPAStatsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      <Card
        className="text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        interactive
        hover
        onClick={onHealthClick}
      >
        <CardContent className="py-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-cyan to-balean-cyan-dark mx-auto mb-2 flex items-center justify-center">
            <Icon name="heart-rate" className="text-white text-xl" />
          </div>
          {compositeHealth.loading && compositeHealth.score === 0 ? (
            <>
              <div className="h-9 flex items-center justify-center">
                <div className="animate-pulse bg-balean-gray-200 rounded w-12 h-8" />
              </div>
              <p className="text-xs text-balean-gray-400 mt-1">Calculating...</p>
              <p className="text-xs text-balean-cyan mt-1 flex items-center justify-center gap-1">
                <Icon name="info" size="sm" />
                Tap for details
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-balean-navy">{compositeHealth.score}</p>
              <p className="text-xs text-balean-gray-400 mt-1 flex items-center justify-center gap-1">
                Estimated Health
                <InfoTip text="A composite score (0-100) derived from species population trends, habitat quality, and environmental data. Higher scores indicate healthier ecosystems." />
              </p>
              <p className={`text-xs mt-0.5 ${
                compositeHealth.confidence === 'high' ? 'text-green-500' :
                compositeHealth.confidence === 'medium' ? 'text-yellow-500' :
                'text-orange-500'
              }`}>
                {compositeHealth.confidence === 'high' ? 'High' :
                 compositeHealth.confidence === 'medium' ? 'Medium' : 'Low'} confidence
              </p>
              <p className="text-xs text-balean-gray-300">
                {compositeHealth.dataSourcesAvailable}/{
                  Object.keys(compositeHealth.breakdown).length
                } sources
                {compositeHealth.backendAvailable && (
                  <span className="ml-1 text-healthy" title="Using Copernicus satellite data">*</span>
                )}
              </p>
              <p className="text-xs text-balean-cyan mt-1 flex items-center justify-center gap-1">
                <Icon name="info" size="sm" />
                Tap for details
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="py-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-coral to-balean-coral-dark mx-auto mb-2 flex items-center justify-center">
            <Icon name="fish" className="text-white text-xl" />
          </div>
          <p className="text-3xl font-bold text-balean-navy">
            {mpa.speciesCount.toLocaleString()}
          </p>
          <p className="text-xs text-balean-gray-400 mt-1">Species</p>
        </CardContent>
      </Card>

      <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="py-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-healthy to-healthy-light mx-auto mb-2 flex items-center justify-center">
            <Icon name="map" className="text-white text-xl" />
          </div>
          <p className="text-3xl font-bold text-balean-navy">{formatArea(mpa.area)}</p>
          <p className="text-xs text-balean-gray-400 mt-1">Area</p>
        </CardContent>
      </Card>

      <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="py-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-yellow to-balean-yellow-dark mx-auto mb-2 flex items-center justify-center">
            <Icon name="calendar" className="text-balean-navy text-xl" />
          </div>
          <p className="text-3xl font-bold text-balean-navy">{mpa.establishedYear}</p>
          <p className="text-xs text-balean-gray-400 mt-1">Established</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
