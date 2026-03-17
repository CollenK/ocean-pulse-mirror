'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/ui';
import {
  COMMON_LITTER_ITEMS,
  OSPAR_LITTER_ITEMS,
  MATERIAL_CONFIG,
  type LitterItemDefinition,
  type LitterTallyEntry,
  type LitterMaterial,
} from '@/types/marine-litter';

interface LitterItemPickerProps {
  tally: LitterTallyEntry[];
  onChange: (tally: LitterTallyEntry[]) => void;
}

export function LitterItemPicker({ tally, onChange }: LitterItemPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const tallyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of tally) {
      map.set(entry.code, entry.count);
    }
    return map;
  }, [tally]);

  const totalItems = useMemo(() => tally.reduce((sum, e) => sum + e.count, 0), [tally]);

  const displayItems = useMemo(() => {
    const source = expanded ? OSPAR_LITTER_ITEMS : COMMON_LITTER_ITEMS;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(
      item => item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    );
  }, [expanded, search]);

  // Group items by material when expanded
  const groupedItems = useMemo(() => {
    if (!expanded) return null;
    const groups: Record<string, LitterItemDefinition[]> = {};
    for (const item of displayItems) {
      if (!groups[item.material]) groups[item.material] = [];
      groups[item.material].push(item);
    }
    return groups;
  }, [expanded, displayItems]);

  const updateCount = (item: LitterItemDefinition, delta: number) => {
    const existing = tally.find(e => e.code === item.code);
    if (existing) {
      const newCount = Math.max(0, existing.count + delta);
      if (newCount === 0) {
        onChange(tally.filter(e => e.code !== item.code));
      } else {
        onChange(tally.map(e => e.code === item.code ? { ...e, count: newCount } : e));
      }
    } else if (delta > 0) {
      onChange([...tally, { code: item.code, name: item.name, material: item.material, count: delta }]);
    }
  };

  const renderItem = (item: LitterItemDefinition) => {
    const count = tallyMap.get(item.code) || 0;
    const materialConf = MATERIAL_CONFIG[item.material];

    return (
      <div
        key={item.code}
        className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
          count > 0 ? `${materialConf.bg} ring-1 ring-inset ring-black/5` : 'bg-white hover:bg-balean-gray-50'
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-balean-navy truncate">{item.name}</p>
          <p className="text-xs text-balean-gray-400">{item.code}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => updateCount(item, -1)}
            disabled={count === 0}
            className="w-7 h-7 rounded-full border border-balean-gray-200 flex items-center justify-center text-balean-gray-400 hover:bg-balean-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={`Decrease ${item.name}`}
          >
            <Icon name="minus" size="sm" />
          </button>
          <span className={`w-8 text-center text-sm font-semibold ${
            count > 0 ? 'text-balean-navy' : 'text-balean-gray-300'
          }`}>
            {count}
          </span>
          <button
            type="button"
            onClick={() => updateCount(item, 1)}
            className="w-7 h-7 rounded-full border border-balean-cyan/30 bg-balean-cyan/10 flex items-center justify-center text-balean-cyan hover:bg-balean-cyan/20 transition-colors"
            aria-label={`Increase ${item.name}`}
          >
            <Icon name="plus" size="sm" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header with total count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-balean-gray-500">
          {totalItems > 0
            ? `${totalItems} item${totalItems !== 1 ? 's' : ''} tallied (${tally.length} type${tally.length !== 1 ? 's' : ''})`
            : 'Tap + to count items found'}
        </p>
      </div>

      {/* Search (shown when expanded) */}
      {expanded && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items by name or code..."
          className="text-sm"
        />
      )}

      {/* Item list */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {expanded && groupedItems ? (
          Object.entries(groupedItems).map(([material, items]) => (
            <div key={material}>
              <p className={`text-xs font-semibold uppercase tracking-wider px-1 py-1.5 ${
                MATERIAL_CONFIG[material as LitterMaterial]?.color || 'text-balean-gray-400'
              }`}>
                {MATERIAL_CONFIG[material as LitterMaterial]?.label || material}
              </p>
              {items.map(renderItem)}
            </div>
          ))
        ) : (
          displayItems.map(renderItem)
        )}
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); setSearch(''); }}
        className="w-full py-2 text-sm font-medium text-balean-cyan hover:text-balean-cyan/80 transition-colors flex items-center justify-center gap-1.5"
      >
        <Icon name={expanded ? 'angle-up' : 'angle-down'} size="sm" />
        {expanded
          ? 'Show common items only'
          : `Show all ${OSPAR_LITTER_ITEMS.length} OSPAR items`}
      </button>
    </div>
  );
}
