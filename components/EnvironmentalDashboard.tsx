/**
 * EnvironmentalDashboard Component
 * Displays grid of environmental metrics with overall habitat quality score
 */

'use client';

import { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import { EnvironmentalMetricCard } from './EnvironmentalMetricCard';

interface EnvironmentalDashboardProps {
  summary: MPAEnvironmentalSummary;
}

export function EnvironmentalDashboard({ summary }: EnvironmentalDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Grid of metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.parameters.map((param) => (
          <EnvironmentalMetricCard key={param.name} parameter={param} />
        ))}
      </div>

      {/* Anomalies Alert */}
      {summary.anomalies.length > 0 && (
        <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">{summary.anomalies.length}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">Environmental Anomalies Detected</h4>
              <div className="space-y-2">
                {summary.anomalies.slice(0, 3).map((anomaly, index) => (
                  <div key={index} className="text-sm text-orange-800">
                    <span className="font-medium">{anomaly.parameter}:</span>{' '}
                    {anomaly.description}
                    {anomaly.severity === 'high' && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        High Severity
                      </span>
                    )}
                  </div>
                ))}
                {summary.anomalies.length > 3 && (
                  <p className="text-xs text-orange-700 mt-2">
                    +{summary.anomalies.length - 3} more anomalies
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
