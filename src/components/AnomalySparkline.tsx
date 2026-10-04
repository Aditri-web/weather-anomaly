import React, { useState } from 'react';
import { TrajectoryPoint } from '../types/weather';
import { TrendingUp, ArrowUpRight, Flame, Wind } from 'lucide-react';

interface AnomalySparklineProps {
  trajectory: TrajectoryPoint[];
  selectedLeadTime: number;
  onSelectLeadTime: (leadTime: number) => void;
  hazardType: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

export const AnomalySparkline: React.FC<AnomalySparklineProps> = ({
  trajectory,
  selectedLeadTime,
  onSelectLeadTime,
  hazardType,
  theme = 'dark',
  compact = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!trajectory || trajectory.length === 0) return null;

  const isLight = theme === 'light';
  const isHeat = hazardType.includes('heat');
  const unit = isHeat ? '°C' : 'mm/d';

  // SVG Geometry Dimensions
  const svgWidth = compact ? 120 : 280;
  const svgHeight = compact ? 36 : 72;
  const paddingX = compact ? 6 : 14;
  const paddingTop = compact ? 6 : 12;
  const paddingBottom = compact ? 6 : 16;

  // Extract values
  const values = trajectory.map(t => t.peak_value ?? t.peak_prob * 100);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = Math.max(1, maxVal - minVal);

  // Compute points
  const points: [number, number][] = trajectory.map((t, idx) => {
    const x = paddingX + (idx / Math.max(1, trajectory.length - 1)) * (svgWidth - 2 * paddingX);
    const val = t.peak_value ?? t.peak_prob * 100;
    // Invert y: highest value is near the top
    const y = paddingTop + (1 - (val - minVal) / valRange) * (svgHeight - paddingTop - paddingBottom);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });

  // Build SVG path
  const pathD = points.reduce((acc, [x, y], idx) => {
    if (idx === 0) return `M ${x} ${y}`;
    // Smooth Catmull-Rom or cubic bezier curve between points
    const prev = points[idx - 1];
    const cp1x = prev[0] + (x - prev[0]) / 2;
    const cp1y = prev[1];
    const cp2x = prev[0] + (x - prev[0]) / 2;
    const cp2y = y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
  }, '');

  // Area under curve for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1][0]} ${svgHeight - paddingBottom} L ${points[0][0]} ${svgHeight - paddingBottom} Z`;

  // Peak Point detection
  const peakIdx = values.indexOf(maxVal);
  const peakPt = trajectory[peakIdx];

  // Theme-aware stroke and fill colors
  const strokeColor = isHeat
    ? isLight ? '#c2410c' : '#ea580c'
    : isLight ? '#be123c' : '#f43f5e';

  const gradientId = `spark-grad-${hazardType}-${compact ? 'c' : 'f'}-${theme}`;

  return (
    <div className={`transition-all duration-200 ${compact ? '' : 'mt-2'}`}>
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className={`w-3.5 h-3.5 ${isHeat ? 'text-amber-500' : 'text-rose-500'}`} />
            <span className={`text-[11px] uppercase tracking-wider font-medium ${
              isLight ? 'text-stone-700' : 'text-stone-300'
            }`}>
              5-Day Forecast Intensity Curve
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className={`text-[10px] ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>Peak:</span>
            <span className={`font-bold ${isHeat ? 'text-amber-600' : 'text-rose-600'}`}>
              {maxVal} {unit} (+{peakPt.lead_time_hours}h)
            </span>
          </div>
        </div>
      )}

      {/* SVG Sparkline Graph */}
      <div className={`relative ${compact ? '' : 'p-2 border' } ${
        compact
          ? ''
          : isLight
          ? 'bg-stone-50 border-stone-200'
          : 'bg-[#151515] border-[#242424]'
      }`}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none cursor-pointer"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={isLight ? 0.35 : 0.45} />
              <stop offset="80%" stopColor={strokeColor} stopOpacity={isLight ? 0.05 : 0.05} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Area fill under curve */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Sparkline curve */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={compact ? 1.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive Waypoints */}
          {points.map(([px, py], idx) => {
            const t = trajectory[idx];
            const isSelected = t.lead_time_hours === selectedLeadTime;
            const isPeak = idx === peakIdx;

            return (
              <g
                key={`spark-pt-${t.lead_time_hours}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLeadTime(t.lead_time_hours);
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group"
              >
                {/* Active lead-time pulsating wave ring */}
                {isSelected && !compact && (
                  <circle
                    cx={px}
                    cy={py}
                    r="8"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                    className="animate-ping"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={px}
                  cy={py}
                  r={isSelected ? 4 : isPeak ? 3.5 : 2.5}
                  fill={isSelected ? (isLight ? '#0f172a' : '#ffffff') : isPeak ? strokeColor : (isLight ? '#ffffff' : '#18181b')}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2 : 1.5}
                  className="transition-transform duration-150 group-hover:scale-150"
                />

                {/* Lead-time label on the bottom (non-compact mode) */}
                {!compact && (
                  <text
                    x={px}
                    y={svgHeight - 2}
                    textAnchor="middle"
                    fill={isSelected ? (isLight ? '#0f172a' : '#ffffff') : isLight ? '#78716c' : '#71717a'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    +{t.lead_time_hours}h
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover / Selected Info Tooltip Banner */}
        {!compact && (
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-dashed border-stone-300 dark:border-stone-800 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isHeat ? 'bg-amber-500' : 'bg-rose-500'}`} />
              <span className={isLight ? 'text-stone-600' : 'text-stone-400'}>
                {hoveredIndex !== null
                  ? `+${trajectory[hoveredIndex].lead_time_hours}h Horizon:`
                  : `Active: +${selectedLeadTime}h Horizon:`}
              </span>
              <span className={`font-mono font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                {hoveredIndex !== null
                  ? `${trajectory[hoveredIndex].peak_value ?? (trajectory[hoveredIndex].peak_prob * 100).toFixed(0)} ${unit}`
                  : `${trajectory.find(t => t.lead_time_hours === selectedLeadTime)?.peak_value ?? maxVal} ${unit}`}
              </span>
            </div>

            <span className={`font-mono ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
              Click point to sync horizon
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
