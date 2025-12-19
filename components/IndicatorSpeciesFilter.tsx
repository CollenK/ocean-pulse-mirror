/**
 * IndicatorSpeciesFilter Component
 * Multi-select category filter for indicator species with animations
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './ui';
import {
  SpeciesCategory,
  CATEGORY_INFO,
  ConservationStatus,
  CONSERVATION_STATUS_INFO,
} from '@/types/indicator-species';

interface IndicatorSpeciesFilterProps {
  selectedCategories: SpeciesCategory[];
  onCategoryChange: (categories: SpeciesCategory[]) => void;
  selectedStatuses?: ConservationStatus[];
  onStatusChange?: (statuses: ConservationStatus[]) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showStatusFilter?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

// Map category to icon names
const CATEGORY_ICONS: Record<SpeciesCategory, string> = {
  [SpeciesCategory.APEX_PREDATOR]: 'shark',
  [SpeciesCategory.CORAL]: 'flower',
  [SpeciesCategory.FOUNDATION]: 'leaf',
  [SpeciesCategory.KEYSTONE]: 'star',
  [SpeciesCategory.SEABIRD]: 'bird',
  [SpeciesCategory.INVERTEBRATE]: 'bug',
};

export function IndicatorSpeciesFilter({
  selectedCategories,
  onCategoryChange,
  selectedStatuses = [],
  onStatusChange,
  searchQuery = '',
  onSearchChange,
  showStatusFilter = false,
  showSearch = true,
  compact = false,
}: IndicatorSpeciesFilterProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const toggleCategory = useCallback((category: SpeciesCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  }, [selectedCategories, onCategoryChange]);

  const toggleStatus = useCallback((status: ConservationStatus) => {
    if (!onStatusChange) return;
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  }, [selectedStatuses, onStatusChange]);

  const selectAllCategories = useCallback(() => {
    onCategoryChange(Object.values(SpeciesCategory));
  }, [onCategoryChange]);

  const clearAllCategories = useCallback(() => {
    onCategoryChange([]);
  }, [onCategoryChange]);

  const allCategoriesSelected = useMemo(() =>
    selectedCategories.length === Object.values(SpeciesCategory).length,
    [selectedCategories]
  );

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${compact ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={compact ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-2">
          <Icon name="filter" size="sm" className="text-ocean-primary" />
          <h3 className="text-sm font-semibold text-ocean-deep">
            Filter Indicator Species
          </h3>
        </div>

        {compact && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon name="chevron-down" size="sm" className="text-gray-400" />
          </motion.div>
        )}

        {!compact && (
          <div className="flex gap-2">
            <button
              onClick={allCategoriesSelected ? clearAllCategories : selectAllCategories}
              className="text-xs text-ocean-primary hover:text-ocean-dark font-medium"
            >
              {allCategoriesSelected ? 'Clear All' : 'Select All'}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isExpanded || !compact) && (
          <motion.div
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search */}
            {showSearch && onSearchChange && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <Icon
                    name="search"
                    size="sm"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search species..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-primary/20 focus:border-ocean-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Icon name="xmark" size="xs" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="px-4 pb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Categories
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(SpeciesCategory).map((category) => {
                  const info = CATEGORY_INFO[category];
                  const isSelected = selectedCategories.includes(category);

                  return (
                    <motion.button
                      key={category}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleCategory(category)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        isSelected
                          ? 'text-white border-transparent'
                          : 'text-gray-600 border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={isSelected ? { backgroundColor: info.color, borderColor: info.color } : {}}
                      aria-pressed={isSelected}
                      role="checkbox"
                      aria-checked={isSelected}
                    >
                      <Icon name={CATEGORY_ICONS[category]} size="sm" />
                      <span className="truncate">{info.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Conservation Status Filter */}
            {showStatusFilter && onStatusChange && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Conservation Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ConservationStatus).map((status) => {
                    const info = CONSERVATION_STATUS_INFO[status];
                    const isSelected = selectedStatuses.includes(status);

                    return (
                      <motion.button
                        key={status}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleStatus(status)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? 'text-white border-transparent'
                            : 'text-gray-600 border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={isSelected ? { backgroundColor: info.color, borderColor: info.color } : {}}
                        aria-pressed={isSelected}
                      >
                        {status}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {selectedCategories.length > 0 && selectedCategories.length < Object.values(SpeciesCategory).length && (
              <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {selectedCategories.length} of {Object.values(SpeciesCategory).length} categories selected
                  </p>
                  <button
                    onClick={clearAllCategories}
                    className="text-xs text-ocean-primary hover:text-ocean-dark font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
