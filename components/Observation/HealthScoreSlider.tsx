'use client';

import { useState, useCallback, useId } from 'react';

interface HealthScoreSliderProps {
  value?: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Very Poor',
  3: 'Poor',
  4: 'Below Average',
  5: 'Average',
  6: 'Above Average',
  7: 'Good',
  8: 'Very Good',
  9: 'Excellent',
  10: 'Pristine',
};

function getScoreColor(score: number): string {
  if (score <= 2) return '#ef4444'; // red-500
  if (score <= 4) return '#f97316'; // orange-500
  if (score <= 6) return '#eab308'; // yellow-500
  if (score <= 8) return '#84cc16'; // lime-500
  return '#22c55e'; // green-500
}

export function HealthScoreSlider({ value, onChange, disabled = false }: HealthScoreSliderProps) {
  const [localValue, setLocalValue] = useState<number>(value || 5);
  const sliderId = useId();

  const currentScore = value !== undefined ? value : localValue;
  const scoreLabel = SCORE_LABELS[currentScore];
  const scoreColor = getScoreColor(currentScore);

  // Calculate fill percentage (1-10 scale, so subtract 1 and divide by 9)
  const fillPercentage = ((currentScore - 1) / 9) * 100;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  // Generate unique class name for this instance
  const sliderClass = `health-slider-${sliderId.replace(/:/g, '')}`;

  return (
    <div className="space-y-3">
      {/* Scoped styles for dynamic thumb color */}
      <style dangerouslySetInnerHTML={{ __html: `
        .${sliderClass}::-webkit-slider-thumb {
          border-color: ${scoreColor} !important;
        }
        .${sliderClass}::-moz-range-thumb {
          border-color: ${scoreColor} !important;
        }
      `}} />

      {/* Header with score display */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Health Score Assessment
        </label>
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold"
            style={{ color: scoreColor }}
          >
            {scoreLabel}
          </span>
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: scoreColor }}
          >
            {currentScore}
          </span>
        </div>
      </div>

      {/* Slider Container */}
      <div className="relative py-2">
        {/* Track background with gradient */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-25" />

        {/* Filled track */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-3 rounded-full transition-all duration-150"
          style={{
            width: `${fillPercentage}%`,
            background: `linear-gradient(to right, #ef4444, ${scoreColor})`
          }}
        />

        {/* Range input */}
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={currentScore}
          onChange={handleChange}
          disabled={disabled}
          className={`${sliderClass} relative w-full h-3 appearance-none cursor-pointer bg-transparent z-10
            [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-runnable-track]:h-3
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-7
            [&::-webkit-slider-thumb]:h-7
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-[3px]
            [&::-webkit-slider-thumb]:border-cyan-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95
            [&::-moz-range-track]:bg-transparent
            [&::-moz-range-track]:h-3
            [&::-moz-range-thumb]:w-7
            [&::-moz-range-thumb]:h-7
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-[3px]
            [&::-moz-range-thumb]:border-cyan-500
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            disabled:cursor-not-allowed
            disabled:opacity-50`}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>1 - Critical</span>
        <span>10 - Pristine</span>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-400 text-center">
        Drag the slider to rate the health of this marine area
      </p>
    </div>
  );
}
