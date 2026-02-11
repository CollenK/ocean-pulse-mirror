'use client';

/**
 * FishingTrendChart Component
 *
 * Displays historical fishing effort trends over time for an MPA.
 * Uses Recharts for visualization with monthly data from Global Fishing Watch.
 */

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  GFWFishingEffortSummary,
  GFWFlagBreakdown,
  GFWGearTypeBreakdown,
  GFWMonthlyData,
} from '@/types/gfw';

// ============================================================================
// Main Fishing Trend Chart
// ============================================================================

interface FishingTrendChartProps {
  data: GFWFishingEffortSummary | null;
  loading?: boolean;
  error?: Error | null;
  height?: number;
  showVesselCount?: boolean;
}

export function FishingTrendChart({
  data,
  loading = false,
  error = null,
  height = 200,
  showVesselCount = true,
}: FishingTrendChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Format data for chart
  const chartData = useMemo(() => {
    if (!data?.monthlyTrend) return [];

    return data.monthlyTrend.map(item => ({
      month: formatMonth(item.month),
      fishingHours: Math.round(item.fishingHours),
      vesselCount: item.vesselCount,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <i className="fi fi-rr-chart-line text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">Fishing Trends</h3>
        </div>
        <div className="text-center py-8">
          <i className="fi fi-rr-exclamation text-red-400 text-2xl mb-2" />
          <p className="text-sm text-balean-gray-500">Failed to load trend data</p>
        </div>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <i className="fi fi-rr-chart-line text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">Fishing Trends</h3>
        </div>
        <div className="text-center py-8">
          <i className="fi fi-rr-chart-line text-balean-gray-300 text-2xl mb-2" />
          <p className="text-sm text-balean-gray-500">No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="fi fi-rr-chart-line text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">Fishing Trends</h3>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex gap-1 bg-balean-gray-50 rounded-lg p-0.5">
          <button
            onClick={() => setChartType('area')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'area'
                ? 'bg-white text-balean-navy shadow-sm'
                : 'text-balean-gray-500 hover:text-balean-navy'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-white text-balean-navy shadow-sm'
                : 'text-balean-gray-500 hover:text-balean-navy'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fishingHoursGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00BCD4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00BCD4" stopOpacity={0} />
              </linearGradient>
              {showVesselCount && (
                <linearGradient id="vesselCountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7043" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF7043" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="fishingHours"
              name="Fishing Hours"
              stroke="#00BCD4"
              strokeWidth={2}
              fill="url(#fishingHoursGradient)"
            />
            {showVesselCount && (
              <Area
                type="monotone"
                dataKey="vesselCount"
                name="Vessels"
                stroke="#FF7043"
                strokeWidth={2}
                fill="url(#vesselCountGradient)"
              />
            )}
          </AreaChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="fishingHours"
              name="Fishing Hours"
              fill="#00BCD4"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-balean-gray-100 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-balean-gray-400 uppercase tracking-wide">Total Hours</p>
          <p className="text-lg font-bold text-balean-navy">
            {formatNumber(data.totalFishingHours)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-balean-gray-400 uppercase tracking-wide">Total Vessels</p>
          <p className="text-lg font-bold text-balean-navy">
            {data.totalVessels.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Fishing By Flag Chart
// ============================================================================

interface FishingByFlagChartProps {
  data: GFWFlagBreakdown[];
  loading?: boolean;
  height?: number;
  maxItems?: number;
}

const FLAG_COLORS = [
  '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2',
  '#FF7043', '#FF8A65', '#FFAB91', '#FFCCBC', '#FBE9E7',
];

export function FishingByFlagChart({
  data,
  loading = false,
  height = 200,
  maxItems = 5,
}: FishingByFlagChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, maxItems).map((item, index) => ({
      ...item,
      fill: FLAG_COLORS[index % FLAG_COLORS.length],
    }));
  }, [data, maxItems]);

  if (loading) {
    return <Skeleton className="h-[200px]" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-balean-gray-500">No flag data available</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="fishingHours"
            nameKey="flagName"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatNumber(value as number) + ' hrs', 'Fishing Hours']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 space-y-1">
        {chartData.map((item, index) => (
          <div key={item.flag} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-balean-gray-600">{item.flagName}</span>
            </div>
            <span className="text-balean-gray-400">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Fishing By Gear Type Chart
// ============================================================================

interface FishingByGearChartProps {
  data: GFWGearTypeBreakdown[];
  loading?: boolean;
  height?: number;
  maxItems?: number;
}

const GEAR_COLORS = [
  '#FF7043', '#FF8A65', '#FFAB91', '#FFCCBC', '#FBE9E7',
  '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2',
];

export function FishingByGearChart({
  data,
  loading = false,
  height = 150,
  maxItems = 5,
}: FishingByGearChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, maxItems);
  }, [data, maxItems]);

  if (loading) {
    return <Skeleton className="h-[150px]" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-balean-gray-500">No gear type data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <YAxis
          type="category"
          dataKey="gearTypeName"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          width={75}
        />
        <Tooltip
          formatter={(value) => [formatNumber(value as number) + ' hrs', 'Fishing Hours']}
        />
        <Bar dataKey="fishingHours" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={GEAR_COLORS[index % GEAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatMonth(monthStr: string): string {
  // Input: '2024-01'
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-balean-gray-100 p-2">
      <p className="text-xs font-medium text-balean-navy mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-balean-gray-600">{entry.name}:</span>
          <span className="font-medium text-balean-navy">
            {formatNumber(entry.value)}
            {entry.name === 'Fishing Hours' ? ' hrs' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
