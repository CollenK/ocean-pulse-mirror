'use client';

interface SSTLegendProps {
  className?: string;
}

/**
 * Legend for the SST (Sea Surface Temperature) map layer.
 * Shows temperature gradient from cold to warm.
 */
export function SSTLegend({ className = '' }: SSTLegendProps) {
  // Temperature gradient matching the Copernicus cmap:thermal color scale
  // Based on cmocean thermal colormap
  // Range: -2°C (271K) to 32°C (305K)
  const gradientStops = [
    { temp: -2, color: '#042333' },   // Dark navy (coldest)
    { temp: 5, color: '#0a4a58' },    // Dark teal
    { temp: 10, color: '#1b6b7a' },   // Teal
    { temp: 15, color: '#6a9e70' },   // Muted green
    { temp: 20, color: '#d9c847' },   // Gold
    { temp: 25, color: '#f0b030' },   // Orange
    { temp: 28, color: '#e8642e' },   // Dark orange
    { temp: 32, color: '#c0220c' },   // Deep red (warmest)
  ];

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg ${className}`}>
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Sea Surface Temperature
      </p>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 w-8">-2°C</span>
        <div
          className="h-3 flex-1 rounded"
          style={{
            background: `linear-gradient(to right, ${gradientStops.map(s => s.color).join(', ')})`,
          }}
        />
        <span className="text-xs text-gray-500 w-8 text-right">32°C</span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Cold</span>
        <span>Warm</span>
      </div>

      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
        Data: Copernicus Marine Service
      </p>
    </div>
  );
}
