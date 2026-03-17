'use client';

/**
 * Litter Charts
 *
 * Source attribution pie chart, material breakdown bar chart,
 * and monthly trend chart for the MPA Litter Pressure dashboard.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { SOURCE_CONFIG, MATERIAL_CONFIG } from '@/types/marine-litter';
import type { LitterSourceBreakdown, LitterMaterialBreakdown, LitterMonthlyTrend } from '@/lib/litter-analytics-service';

// Colors for sources (mapped from SOURCE_CONFIG icons to chart-friendly palette)
const SOURCE_COLORS: Record<string, string> = {
  fishing: '#0891b2',
  aquaculture: '#06b6d4',
  shipping: '#6366f1',
  food_drink: '#f59e0b',
  smoking: '#ef4444',
  sewage: '#a855f7',
  recreation: '#22c55e',
  agriculture: '#84cc16',
  construction: '#f97316',
  medical: '#dc2626',
  unknown: '#9ca3af',
};

// Colors for materials (from MATERIAL_CONFIG, simplified for charts)
const MATERIAL_COLORS: Record<string, string> = {
  plastic: '#3b82f6',
  metal: '#6b7280',
  glass: '#10b981',
  paper: '#d97706',
  wood: '#c2410c',
  cloth: '#9333ea',
  rubber: '#78716c',
  sanitary: '#ec4899',
  medical: '#dc2626',
  other: '#9ca3af',
};

// ============================================================================
// Source Attribution Pie Chart
// ============================================================================

interface LitterBySourceChartProps {
  data: LitterSourceBreakdown[];
  height?: number;
}

export function LitterBySourceChart({ data, height = 220 }: LitterBySourceChartProps) {
  const chartData = useMemo(() =>
    data.filter(d => d.count > 0).map(d => ({
      name: SOURCE_CONFIG[d.source]?.label || d.source,
      value: d.count,
      percentage: Math.round(d.percentage),
      fill: SOURCE_COLORS[d.source] || '#9ca3af',
    })),
    [data]
  );

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={75}
          dataKey="value"
          stroke="none"
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{d.name}</p>
                <p className="text-gray-600">{d.value} items ({d.percentage}%)</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Material Breakdown Bar Chart
// ============================================================================

interface LitterByMaterialChartProps {
  data: LitterMaterialBreakdown[];
  height?: number;
}

export function LitterByMaterialChart({ data, height = 200 }: LitterByMaterialChartProps) {
  const chartData = useMemo(() =>
    data.filter(d => d.count > 0).slice(0, 8).map(d => ({
      name: MATERIAL_CONFIG[d.material]?.label || d.material,
      count: d.count,
      fill: MATERIAL_COLORS[d.material] || '#9ca3af',
    })),
    [data]
  );

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={90}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{d.name}</p>
                <p className="text-gray-600">{d.count} items</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Monthly Trend Chart
// ============================================================================

interface LitterTrendChartProps {
  data: LitterMonthlyTrend[];
  height?: number;
}

function formatMonth(yyyymm: string): string {
  const [year, month] = yyyymm.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`;
}

export function LitterTrendChart({ data, height = 200 }: LitterTrendChartProps) {
  const chartData = useMemo(() =>
    data.map(d => ({
      month: formatMonth(d.month),
      items: d.totalItems,
      reports: d.reportCount,
      density: d.itemsPer100m,
    })),
    [data]
  );

  if (chartData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="litterGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900 mb-1">{label}</p>
                <p className="text-gray-600">{d.items} items from {d.reports} report{d.reports !== 1 ? 's' : ''}</p>
                {d.density != null && (
                  <p className="text-teal-600">{d.density} items/100m (avg)</p>
                )}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="items"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#litterGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
