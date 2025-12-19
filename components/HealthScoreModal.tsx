'use client';

import { Modal, Icon, Badge } from './ui';
import { CircularProgress, getHealthColor } from './CircularProgress';

interface HealthScoreBreakdown {
  score: number;
  loading: boolean;
  breakdown: {
    populationTrends: { score: number; weight: number; available: boolean };
    habitatQuality: { score: number; weight: number; available: boolean };
    speciesDiversity: { score: number; weight: number; available: boolean };
  };
  confidence: 'high' | 'medium' | 'low';
  dataSourcesAvailable: number;
}

interface HealthScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthData: HealthScoreBreakdown;
}

interface DataSourceCardProps {
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  score: number;
  weight: number;
  available: boolean;
}

function DataSourceCard({
  name,
  description,
  icon,
  iconColor,
  score,
  weight,
  available,
}: DataSourceCardProps) {
  return (
    <div className={`p-4 rounded-xl border ${available ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          available
            ? 'bg-gradient-to-br from-ocean-primary/10 to-ocean-accent/10'
            : 'bg-gray-100'
        }`}>
          <Icon
            name={icon}
            className={`text-lg ${available ? iconColor : 'text-gray-400'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`font-semibold ${available ? 'text-ocean-deep' : 'text-gray-400'}`}>
              {name}
            </h4>
            <Badge
              variant={available ? 'info' : 'secondary'}
              size="sm"
            >
              {weight}% weight
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mb-3">{description}</p>

          {available ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    score >= 70 ? 'bg-green-500' :
                    score >= 50 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${
                score >= 70 ? 'text-green-600' :
                score >= 50 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                {score}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Icon name="circle-exclamation" size="sm" />
              <span className="text-xs">No data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HealthScoreModal({
  isOpen,
  onClose,
  healthData,
}: HealthScoreModalProps) {
  const { score, breakdown, confidence, dataSourcesAvailable } = healthData;

  const confidenceInfo = {
    high: { label: 'High Confidence', color: 'text-green-600', bg: 'bg-green-100' },
    medium: { label: 'Medium Confidence', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    low: { label: 'Low Confidence', color: 'text-orange-600', bg: 'bg-orange-100' },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Health Score Breakdown" size="md">
      {/* Overall Score */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <CircularProgress
            value={score}
            size="xl"
            color={getHealthColor(score)}
          />
        </div>
      </div>

      {/* Confidence Badge */}
      <div className="flex justify-center mb-6">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${confidenceInfo[confidence].bg}`}>
          <Icon
            name={confidence === 'high' ? 'circle-check' : confidence === 'medium' ? 'circle-exclamation' : 'triangle-exclamation'}
            className={`text-sm ${confidenceInfo[confidence].color}`}
          />
          <span className={`text-sm font-medium ${confidenceInfo[confidence].color}`}>
            {confidenceInfo[confidence].label}
          </span>
          <span className="text-xs text-gray-500">
            ({dataSourcesAvailable}/3 sources)
          </span>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600 text-center mb-6">
        The composite health score is calculated from multiple real-time data sources,
        each weighted by their importance to ecosystem health.
      </p>

      {/* Data Sources */}
      <div className="space-y-3">
        <DataSourceCard
          name="Population Trends"
          description="10-year population trends of indicator species from OBIS data"
          icon="arrow-trend-up"
          iconColor="text-purple-600"
          score={breakdown.populationTrends.score}
          weight={breakdown.populationTrends.weight}
          available={breakdown.populationTrends.available}
        />

        <DataSourceCard
          name="Habitat Quality"
          description="Environmental conditions including temperature, salinity, and pH from OBIS-ENV-DATA"
          icon="flask"
          iconColor="text-cyan-600"
          score={breakdown.habitatQuality.score}
          weight={breakdown.habitatQuality.weight}
          available={breakdown.habitatQuality.available}
        />

        <DataSourceCard
          name="Species Diversity"
          description="Presence and diversity of ecosystem indicator species"
          icon="leaf"
          iconColor="text-emerald-600"
          score={breakdown.speciesDiversity.score}
          weight={breakdown.speciesDiversity.weight}
          available={breakdown.speciesDiversity.available}
        />
      </div>

      {/* Footer Note */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Scores are dynamically weighted based on data availability.
          If a source is unavailable, its weight is redistributed to other sources.
        </p>
      </div>
    </Modal>
  );
}
