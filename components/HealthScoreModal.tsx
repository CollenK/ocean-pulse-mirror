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
    thermalStress?: { score: number; weight: number; available: boolean };
    productivity?: { score: number; weight: number; available: boolean };
    communityAssessment?: { score: number; weight: number; available: boolean; count: number };
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
  subtitle?: string;
  unavailableMessage?: string;
}

function DataSourceCard({
  name,
  description,
  icon,
  iconColor,
  score,
  weight,
  available,
  subtitle,
  unavailableMessage,
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
              variant={available ? 'info' : 'default'}
              size="sm"
            >
              {weight}% weight
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mb-3">{description}</p>

          {available ? (
            <div>
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
              {subtitle && (
                <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Icon name="circle-exclamation" size="sm" />
              <span className="text-xs">{unavailableMessage || 'No data available'}</span>
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

  // Count total possible sources from the breakdown object
  const totalSources = [
    true, // populationTrends always present
    true, // habitatQuality always present
    true, // speciesDiversity always present
    breakdown.thermalStress !== undefined,
    breakdown.productivity !== undefined,
    breakdown.communityAssessment !== undefined,
  ].filter(Boolean).length;

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
            ({dataSourcesAvailable}/{totalSources} sources)
          </span>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600 text-center mb-6">
        The composite health score is calculated from multiple real-time data sources
        and community observations, each weighted by their importance to ecosystem health.
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

        {breakdown.thermalStress && (
          <DataSourceCard
            name="Thermal Stress"
            description="Sea surface temperature anomalies from Copernicus satellite data"
            icon="temperature-high"
            iconColor="text-red-500"
            score={breakdown.thermalStress.score}
            weight={breakdown.thermalStress.weight}
            available={breakdown.thermalStress.available}
          />
        )}

        {breakdown.productivity && (
          <DataSourceCard
            name="Productivity"
            description="Ocean productivity measured by chlorophyll concentration"
            icon="seedling"
            iconColor="text-green-500"
            score={breakdown.productivity.score}
            weight={breakdown.productivity.weight}
            available={breakdown.productivity.available}
          />
        )}

        {breakdown.communityAssessment !== undefined && (
          <DataSourceCard
            name="Community Observations"
            description="Health assessments contributed by citizen scientists and marine observers"
            icon="users"
            iconColor="text-amber-600"
            score={Math.round(breakdown.communityAssessment.score)}
            weight={breakdown.communityAssessment.weight}
            available={breakdown.communityAssessment.available}
            subtitle={breakdown.communityAssessment.available
              ? `Based on ${breakdown.communityAssessment.count} assessment${breakdown.communityAssessment.count !== 1 ? 's' : ''}`
              : undefined
            }
            unavailableMessage="No community assessments yet. Be the first to contribute!"
          />
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Scientific data sources are dynamically weighted based on availability.
          Community observations contribute up to 10% of the overall score.
        </p>
      </div>
    </Modal>
  );
}
