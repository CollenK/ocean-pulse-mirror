'use client';

import { useState, useCallback } from 'react';

interface HealthScoreSliderProps {
  value?: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

const SCORE_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Critical', description: 'Severe degradation, immediate action needed' },
  2: { label: 'Very Poor', description: 'Major damage, rapid decline observed' },
  3: { label: 'Poor', description: 'Significant issues, declining health' },
  4: { label: 'Below Average', description: 'Notable concerns, some degradation' },
  5: { label: 'Average', description: 'Moderate condition, room for improvement' },
  6: { label: 'Above Average', description: 'Fair condition, minor issues' },
  7: { label: 'Good', description: 'Healthy with some minor concerns' },
  8: { label: 'Very Good', description: 'Thriving ecosystem, well maintained' },
  9: { label: 'Excellent', description: 'Outstanding health, pristine condition' },
  10: { label: 'Pristine', description: 'Perfect natural state, no visible impact' },
};

function getScoreColor(score: number): string {
  if (score <= 2) return 'bg-red-500';
  if (score <= 4) return 'bg-orange-500';
  if (score <= 6) return 'bg-yellow-500';
  if (score <= 8) return 'bg-lime-500';
  return 'bg-green-500';
}

function getScoreTextColor(score: number): string {
  if (score <= 2) return 'text-red-600';
  if (score <= 4) return 'text-orange-600';
  if (score <= 6) return 'text-yellow-600';
  if (score <= 8) return 'text-lime-600';
  return 'text-green-600';
}

function getTrackGradient(): string {
  return 'bg-gradient-to-r from-red-500 via-yellow-500 to-green-500';
}

export function HealthScoreSlider({ value, onChange, disabled = false }: HealthScoreSliderProps) {
  const [localValue, setLocalValue] = useState<number>(value || 5);
  const [isDragging, setIsDragging] = useState(false);

  const currentScore = value !== undefined ? value : localValue;
  const scoreInfo = SCORE_LABELS[currentScore];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleScoreClick = useCallback((score: number) => {
    if (disabled) return;
    setLocalValue(score);
    onChange(score);
  }, [disabled, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          Health Score Assessment
        </label>
        <span className={`text-2xl font-bold ${getScoreTextColor(currentScore)}`}>
          {currentScore}/10
        </span>
      </div>

      {/* Score Display */}
      <div className={`p-4 rounded-xl border-2 transition-colors ${
        isDragging ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreColor(currentScore)} text-white text-2xl font-bold mb-2`}>
            {currentScore}
          </div>
          <p className={`font-semibold ${getScoreTextColor(currentScore)}`}>
            {scoreInfo.label}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {scoreInfo.description}
          </p>
        </div>

        {/* Slider */}
        <div className="relative pt-2">
          <div className={`absolute inset-x-0 h-3 rounded-full ${getTrackGradient()} opacity-30`} />
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={currentScore}
            onChange={handleChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={disabled}
            className="relative w-full h-3 appearance-none cursor-pointer bg-transparent z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-cyan-500
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-4
              [&::-moz-range-thumb]:border-cyan-500
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
              disabled:cursor-not-allowed
              disabled:opacity-50"
          />
        </div>

        {/* Score Labels */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-xs text-red-500 font-medium">1</span>
          <span className="text-xs text-orange-500 font-medium">3</span>
          <span className="text-xs text-yellow-500 font-medium">5</span>
          <span className="text-xs text-lime-500 font-medium">7</span>
          <span className="text-xs text-green-500 font-medium">10</span>
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => handleScoreClick(score)}
            disabled={disabled}
            className={`p-2 rounded-lg text-sm font-semibold transition-all ${
              currentScore === score
                ? `${getScoreColor(score)} text-white shadow-md scale-105`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {score}
          </button>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 text-center">
        Your assessment contributes to the overall MPA health score
      </p>
    </div>
  );
}
