'use client';

import React from 'react';

interface MetricsChartProps {
  data: any[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export default function MetricsChart({
  data,
  dataKey,
  xKey,
  color = '#6366f1',
  height = 250,
  showGrid = true,
  showTooltip = true,
}: MetricsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Find min and max values for scaling
  const values = data.map(d => d[dataKey] || 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // Calculate bar width based on data length
  const barWidth = Math.max(100 / data.length - 1, 2);

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
        <span>{maxValue.toFixed(1)}</span>
        <span>{((maxValue + minValue) / 2).toFixed(1)}</span>
        <span>{minValue.toFixed(1)}</span>
      </div>

      {/* Chart area */}
      <div className="ml-8 h-full relative">
        {/* Grid lines */}
        {showGrid && (
          <div className="absolute inset-0">
            <div className="h-full flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-gray-100" />
              ))}
            </div>
          </div>
        )}

        {/* Bars */}
        <div className="relative h-full flex items-end justify-between px-2">
          {data.map((item, index) => {
            const value = item[dataKey] || 0;
            const barHeight = ((value - minValue) / range) * 100;
            
            return (
              <div
                key={index}
                className="relative group"
                style={{ width: `${barWidth}%` }}
              >
                {/* Bar */}
                <div
                  className="mx-0.5 rounded-t transition-all duration-200 hover:opacity-80"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: color,
                  }}
                />
                
                {/* Tooltip */}
                {showTooltip && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      <div className="font-semibold">{item[xKey]}</div>
                      <div>{value.toFixed(1)}</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 mt-2">
          {data.map((item, index) => {
            // Only show every nth label if there are too many
            const showLabel = data.length <= 10 || index % Math.ceil(data.length / 10) === 0;
            
            return (
              <div
                key={index}
                className="text-xs text-gray-500 text-center"
                style={{ width: `${barWidth}%` }}
              >
                {showLabel && (
                  <span className="block transform -rotate-45 origin-top-left">
                    {item[xKey]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}