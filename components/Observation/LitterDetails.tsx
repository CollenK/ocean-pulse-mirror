'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/ui';
import { LitterItemPicker } from './LitterItemPicker';
import { SURVEY_LENGTHS, type LitterTallyEntry, type LitterReportData } from '@/types/marine-litter';

interface LitterDetailsProps {
  value: LitterReportData;
  onChange: (data: LitterReportData) => void;
}

export function LitterDetails({ value, onChange }: LitterDetailsProps) {
  const [mode, setMode] = useState<'quick' | 'survey'>(value.isSurvey ? 'survey' : 'quick');

  const handleModeChange = (newMode: 'quick' | 'survey') => {
    setMode(newMode);
    onChange({
      ...value,
      isSurvey: newMode === 'survey',
      surveyLengthM: newMode === 'survey' ? (value.surveyLengthM || 100) : undefined,
    });
  };

  const handleItemsChange = (items: LitterTallyEntry[]) => {
    onChange({ ...value, items });
  };

  const handleWeightChange = (weight: string) => {
    const num = parseFloat(weight);
    onChange({ ...value, totalWeight: isNaN(num) ? undefined : num });
  };

  const handleSurveyLengthChange = (length: number) => {
    onChange({ ...value, surveyLengthM: length });
  };

  const totalItems = value.items.reduce((sum, e) => sum + e.count, 0);

  return (
    <section className="space-y-4 p-4 bg-teal-50/50 rounded-xl border border-teal-200/50">
      <h3 className="font-semibold text-balean-navy flex items-center gap-2">
        <Icon name="trash" /> Litter Report
      </h3>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('quick')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'quick'
              ? 'bg-teal-500 text-white shadow-sm'
              : 'bg-white text-balean-gray-500 border border-balean-gray-200 hover:border-teal-300'
          }`}
        >
          Quick Report
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('survey')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'survey'
              ? 'bg-teal-500 text-white shadow-sm'
              : 'bg-white text-balean-gray-500 border border-balean-gray-200 hover:border-teal-300'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            OSPAR Survey
            <span className="text-xs opacity-75">(MCS compatible)</span>
          </span>
        </button>
      </div>

      {/* Survey length (survey mode only) */}
      {mode === 'survey' && (
        <div>
          <label className="block text-sm font-medium text-balean-gray-600 mb-2">
            Survey Transect Length
          </label>
          <div className="flex gap-2">
            {SURVEY_LENGTHS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSurveyLengthChange(opt.value)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  value.surveyLengthM === opt.value
                    ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300'
                    : 'bg-white text-balean-gray-500 border border-balean-gray-200 hover:border-teal-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-balean-gray-400">
            Use 10m for high-density beaches, 100m for standard OSPAR monitoring
          </p>
        </div>
      )}

      {/* Item tally */}
      <div>
        <label className="block text-sm font-medium text-balean-gray-600 mb-2">
          Litter Items Found
        </label>
        <LitterItemPicker tally={value.items} onChange={handleItemsChange} />
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-medium text-balean-gray-600 mb-2">
          Total Weight (kg)
        </label>
        <Input
          type="number"
          min="0"
          step="0.1"
          value={value.totalWeight ?? ''}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="e.g., 2.5"
        />
        <p className="mt-1.5 text-xs text-balean-gray-400">
          Weigh your collected litter if possible. Weight data is rarely captured centrally and is highly valuable.
        </p>
      </div>

      {/* Summary stats */}
      {(totalItems > 0 || value.totalWeight) && (
        <div className="flex gap-3 p-3 bg-white rounded-lg border border-teal-100">
          {totalItems > 0 && (
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-teal-600">{totalItems}</p>
              <p className="text-xs text-balean-gray-400">items</p>
            </div>
          )}
          {value.totalWeight && (
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-teal-600">{value.totalWeight} kg</p>
              <p className="text-xs text-balean-gray-400">weight</p>
            </div>
          )}
          {mode === 'survey' && value.surveyLengthM && totalItems > 0 && (
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-teal-600">
                {Math.round((totalItems / value.surveyLengthM) * 100)}
              </p>
              <p className="text-xs text-balean-gray-400">items/100m</p>
            </div>
          )}
          {value.items.length > 0 && (
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-teal-600">{value.items.length}</p>
              <p className="text-xs text-balean-gray-400">categories</p>
            </div>
          )}
        </div>
      )}

      {/* Data provenance note */}
      <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
        <Icon name="info" size="sm" className="text-teal-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-teal-700">
          {mode === 'survey'
            ? 'This survey follows OSPAR/MCS Beachwatch methodology. Data can be used for national beach litter reporting and MSFD Descriptor 10 assessments.'
            : 'Quick reports capture valuable location, weight, and composition data. For formal monitoring, use OSPAR Survey mode.'}
        </p>
      </div>
    </section>
  );
}
