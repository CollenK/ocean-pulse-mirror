'use client';

import { ReportType, REPORT_TYPES } from '@/types';

interface ReportTypeSelectorProps {
  value?: ReportType;
  onChange: (type: ReportType) => void;
  disabled?: boolean;
}

export function ReportTypeSelector({ value, onChange, disabled = false }: ReportTypeSelectorProps) {
  const reportTypes = Object.entries(REPORT_TYPES) as [ReportType, typeof REPORT_TYPES[ReportType]][];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Report Type
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reportTypes.map(([type, info]) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              value === type
                ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl flex-shrink-0">{info.icon}</span>
            <div className="min-w-0">
              <p className={`font-semibold ${
                value === type ? 'text-cyan-700' : 'text-gray-800'
              }`}>
                {info.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {info.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
