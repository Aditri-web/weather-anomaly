import React, { useState, useRef } from 'react';
import { AnomalySummary, AlertItem, Coordinates } from '../types/weather';
import { Layers, Crosshair, Compass, Wind, Clock, ShieldAlert } from 'lucide-react';

interface GeoMapProps {
  anomalies: AnomalySummary[];
  alerts: AlertItem[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  selectedLeadTime: number;
  onSelectLeadTime: (hours: number) => void;
  onMapClick?: (coords: Coordinates) => void;
  queryPoint?: Coordinates | null;
  queryRadiusKm?: number;
  theme?: 'light' | 'dark';
}

export const GeoMap: React.FC<GeoMapProps> = ({
  anomalies,
  alerts,
  selectedAnomalyId,
  onSelectAnomaly,
  selectedLeadTime,
  onSelectLeadTime,
  onMapClick,
  queryPoint,
  queryRadiusKm = 25,
  theme = 'dark',
}) => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [showRadiusBuffers, setShowRadiusBuffers] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'precipitation' | 'efi'>('precipitation');
  const [hoverCoords, setHoverCoords] = useState<Coordinates | null>(null);
  const [hoveredAlert, setHoveredAlert] = useState<AlertItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const isLight = theme === 'light';

  // Map geographic bounds roughly covering the Bay of Bengal & South Asia region
  // Lat: 6 to 34 N, Lon: 68 to 96 E
  const minLat = 7.0;
  const maxLat = 33.0;
  const minLon = 68.0;
  const maxLon = 95.0;

  const width = 800;
  const height = 550;

  const project = (lat: number, lon: number): [number, number] => {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  };

  const unproject = (x: number, y: number): Coordinates => {
    const lon = Number((minLon + (x / width) * (maxLon - minLon)).toFixed(2));
    const lat = Number((maxLat - (y / height) * (maxLat - minLat)).toFixed(2));
    return { lat, lon };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    setHoverCoords(unproject(x, y));
  };

  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const coords = unproject(x, y);
    if (onMapClick) {
      onMapClick(coords);
    }
  };

  // Coastal / Geographical Reference Lines
  const coastlinePaths = [
    [
      [23.0, 68.5], [21.5, 69.5], [20.8, 70.4], [21.7, 72.5], [20.0, 72.8],
      [18.9, 72.8], [15.5, 73.8], [13.0, 74.8], [10.0, 76.2], [8.1, 77.5],
      [9.3, 79.1], [10.8, 79.9], [13.1, 80.3], [16.0, 81.5], [17.7, 83.3],
      [19.8, 85.8], [21.5, 87.0], [22.0, 89.0], [22.5, 91.8], [20.5, 92.8],
    ],
    [
      [9.8, 80.2], [8.6, 81.2], [7.0, 81.8], [6.0, 80.6], [7.0, 79.8], [9.8, 80.2]
    ]
  ];

  const selectedAnomaly = anomalies.find(a => a.track_id === selectedAnomalyId) || anomalies[0];
  const activePt = selectedAnomaly?.trajectory.find(t => t.lead_time_hours === selectedLeadTime) || selectedAnomaly?.trajectory[0];
  const activePtPos = activePt ? project(activePt.lat, activePt.lon) : [400, 275];

  return (
    <div className={`relative rounded-none border overflow-hidden shadow-xl transition-colors duration-300 ${
      isLight ? 'bg-[#fafaf7] border-stone-300' : 'bg-[#111111] border-[#222222]'
    }`}>
      {/* Map Control Header */}
      <div className={`flex flex-wrap items-center justify-between px-6 py-3.5 border-b text-xs gap-3 ${
        isLight ? 'bg-white border-stone-200' : 'bg-[#141414] border-[#222222]'
      }`}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`font-serif italic text-base tracking-wide ${
            isLight ? 'text-stone-900' : 'text-stone-100'
          }`}>
            Ensemble Spatial Projection
          </span>
          <span className={`font-mono text-[11px] hidden sm:inline ${
            isLight ? 'text-stone-500' : 'text-stone-500'
          }`}>
            12 km NEPS-G &bull; 5 km Regional Target
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRadarSweep(!showRadarSweep)}
            className={`px-3 py-1 border text-[11px] font-medium tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${
              showRadarSweep
                ? isLight
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-stone-100 text-stone-900 border-stone-100 shadow-sm'
                : isLight
                ? 'bg-transparent text-stone-600 border-stone-300 hover:border-stone-500 hover:text-stone-900'
                : 'bg-transparent text-stone-400 border-stone-800 hover:border-stone-600 hover:text-stone-200'
            }`}
          >
            <Wind className="w-3 h-3" />
            Radar Sweep
          </button>

          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`px-3 py-1 border text-[11px] font-medium tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${
              showMesh
                ? isLight
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-stone-100 text-stone-900 border-stone-100 shadow-sm'
                : isLight
                ? 'bg-transparent text-stone-600 border-stone-300 hover:border-stone-500 hover:text-stone-900'
                : 'bg-transparent text-stone-400 border-stone-800 hover:border-stone-600 hover:text-stone-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            Mesh Grid
          </button>

          <button
            onClick={() => setShowRadiusBuffers(!showRadiusBuffers)}
            className={`px-3 py-1 border text-[11px] font-medium tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${
              showRadiusBuffers
                ? isLight
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-stone-100 text-stone-900 border-stone-100 shadow-sm'
                : isLight
                ? 'bg-transparent text-stone-600 border-stone-300 hover:border-stone-500 hover:text-stone-900'
                : 'bg-transparent text-stone-400 border-stone-800 hover:border-stone-600 hover:text-stone-200'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            5 km Buffers
          </button>

          <div className={`flex border p-0.5 ${isLight ? 'border-stone-300' : 'border-stone-800'}`}>
            <button
              onClick={() => setActiveLayer('precipitation')}
              className={`px-2.5 py-0.5 text-[10px] uppercase font-medium transition-colors ${
                activeLayer === 'precipitation'
                  ? isLight
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-stone-200 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Field
            </button>
            <button
              onClick={() => setActiveLayer('efi')}
              className={`px-2.5 py-0.5 text-[10px] uppercase font-medium transition-colors ${
                activeLayer === 'efi'
                  ? isLight
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-stone-200 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              EFI
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div
        ref={mapWrapperRef}
        className={`relative w-full aspect-[16/11] max-h-[580px] select-none cursor-crosshair transition-colors duration-300 ${
          isLight ? 'bg-[#f4f4ee]' : 'bg-[#0c0c0c]'
        }`}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleSvgClick}
        >
          <defs>
            <radialGradient id="crosbyCycloneGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity={isLight ? "0.35" : "0.45"} />
              <stop offset="60%" stopColor="#9f1239" stopOpacity={isLight ? "0.10" : "0.15"} />
              <stop offset="100%" stopColor="#4c0519" stopOpacity="0.0" />
            </radialGradient>
            <radialGradient id="crosbyHeatGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity={isLight ? "0.40" : "0.5"} />
              <stop offset="70%" stopColor="#9a3412" stopOpacity={isLight ? "0.10" : "0.12"} />
              <stop offset="100%" stopColor="#431407" stopOpacity="0.0" />
            </radialGradient>
            <pattern id="crosbyMeshGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={isLight ? "#e5e5dc" : "#1f1f23"}
                strokeWidth="0.5"
                strokeDasharray="1,3"
              />
            </pattern>
            <linearGradient id="radarBeamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? "#0f172a" : "#f5f5f4"} stopOpacity={isLight ? "0.18" : "0.25"} />
              <stop offset="70%" stopColor="#e11d48" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#4c0519" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Graticule & Lat/Lon Grid lines */}
          <rect width={width} height={height} fill="url(#crosbyMeshGrid)" opacity="0.9" />

          {/* Latitude guide lines */}
          {[10, 15, 20, 25, 30].map(lat => {
            const [, y] = project(lat, minLon);
            return (
              <g key={`lat-${lat}`}>
                <line x1="0" y1={y} x2={width} y2={y} stroke={isLight ? "#e2e2da" : "#18181b"} strokeWidth="1" />
                <text x="12" y={y - 4} fill={isLight ? "#64748b" : "#52525b"} fontSize="9" fontFamily="monospace">
                  {lat}°N
                </text>
              </g>
            );
          })}

          {/* Longitude guide lines */}
          {[70, 75, 80, 85, 90].map(lon => {
            const [x] = project(minLat, lon);
            return (
              <g key={`lon-${lon}`}>
                <line x1={x} y1="0" x2={x} y2={height} stroke={isLight ? "#e2e2da" : "#18181b"} strokeWidth="1" />
                <text x={x + 4} y={height - 10} fill={isLight ? "#64748b" : "#52525b"} fontSize="9" fontFamily="monospace">
                  {lon}°E
                </text>
              </g>
            );
          })}

          {/* Hover Crosshair Guides */}
          {hoverCoords && (
            <g opacity="0.5" pointerEvents="none">
              {(() => {
                const [hx, hy] = project(hoverCoords.lat, hoverCoords.lon);
                return (
                  <>
                    <line x1="0" y1={hy} x2={width} y2={hy} stroke={isLight ? "#475569" : "#71717a"} strokeWidth="0.75" strokeDasharray="3,3" />
                    <line x1={hx} y1="0" x2={hx} y2={height} stroke={isLight ? "#475569" : "#71717a"} strokeWidth="0.75" strokeDasharray="3,3" />
                  </>
                );
              })()}
            </g>
          )}

          {/* Spherical Icosahedral Mesh Overlay */}
          {showMesh && (
            <g opacity={isLight ? "0.22" : "0.18"}>
              {[
                [[12, 70], [16, 76], [22, 71]],
                [[16, 76], [22, 71], [24, 78]],
                [[16, 76], [20, 83], [24, 78]],
                [[16, 76], [12, 80], [20, 83]],
                [[12, 80], [14, 88], [20, 83]],
                [[20, 83], [14, 88], [22, 90]],
                [[20, 83], [26, 85], [22, 90]],
                [[24, 78], [20, 83], [26, 85]],
                [[24, 78], [28, 80], [26, 85]],
                [[22, 71], [28, 74], [24, 78]],
                [[28, 74], [32, 77], [28, 80]],
                [[10, 78], [12, 84], [8, 81]],
              ].map((tri, idx) => {
                const [p1, p2, p3] = tri.map(pt => project(pt[0], pt[1]));
                return (
                  <polygon
                    key={`tri-${idx}`}
                    points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`}
                    fill="none"
                    stroke={isLight ? "#78716c" : "#d6d3d1"}
                    strokeWidth="0.6"
                    strokeDasharray="2,2"
                  />
                );
              })}
            </g>
          )}

          {/* Geographical Reference Coastlines */}
          {coastlinePaths.map((path, idx) => {
            const pointsStr = path.map(pt => project(pt[0], pt[1]).join(',')).join(' ');
            return (
              <polyline
                key={`coast-${idx}`}
                points={pointsStr}
                fill="none"
                stroke={isLight ? "#334155" : "#3f3f46"}
                strokeWidth={isLight ? "1.8" : "1.6"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Geographic Sea Labels */}
          <text
            x={project(13.5, 86.8)[0]}
            y={project(13.5, 86.8)[1]}
            fill={isLight ? "#94a3b8" : "#27272a"}
            fontSize="14"
            fontFamily="serif"
            fontStyle="italic"
            letterSpacing="4"
          >
            BAY OF BENGAL
          </text>
          <text
            x={project(15, 69.5)[0]}
            y={project(15, 69.5)[1]}
            fill={isLight ? "#94a3b8" : "#27272a"}
            fontSize="12"
            fontFamily="serif"
            fontStyle="italic"
            letterSpacing="3"
          >
            ARABIAN SEA
          </text>

          {/* Anomaly Bounding Boxes with Margin */}
          {anomalies.map(anomaly => {
            const [minBBoxLat, minBBoxLon, maxBBoxLat, maxBBoxLon] = anomaly.bbox_with_margin;
            const [tlX, tlY] = project(maxBBoxLat, minBBoxLon);
            const [brX, brY] = project(minBBoxLat, maxBBoxLon);
            const isSelected = anomaly.track_id === selectedAnomalyId;

            return (
              <g key={`bbox-${anomaly.track_id}`}>
                <rect
                  x={tlX}
                  y={tlY}
                  width={brX - tlX}
                  height={brY - tlY}
                  fill={
                    anomaly.hazard_type.includes('heat')
                      ? isLight ? 'rgba(234, 88, 12, 0.08)' : 'rgba(234, 88, 12, 0.04)'
                      : isLight ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.04)'
                  }
                  stroke={isSelected ? (isLight ? '#0f172a' : '#f5f5f4') : (isLight ? '#cbd5e1' : '#27272a')}
                  strokeWidth={isSelected ? '1.5' : '0.8'}
                  strokeDasharray={isSelected ? '3,2' : '2,2'}
                  className="cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAnomaly(anomaly.track_id);
                  }}
                />
                <text
                  x={tlX + 8}
                  y={tlY + 16}
                  fill={isSelected ? (isLight ? '#0f172a' : '#f5f5f4') : (isLight ? '#64748b' : '#71717a')}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isSelected ? "bold" : "normal"}
                  letterSpacing="1"
                >
                  {anomaly.track_id} · CROP
                </text>
              </g>
            );
          })}

          {/* Animated Trajectory Tracks */}
          {anomalies.map(anomaly => {
            const isSelected = anomaly.track_id === selectedAnomalyId;
            const pts = anomaly.trajectory.map(t => project(t.lat, t.lon));
            const pathData = pts.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr[0]} ${curr[1]}`, '');

            return (
              <g key={`track-${anomaly.track_id}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? (isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(250, 250, 249, 0.25)') : (isLight ? '#94a3b8' : '#3f3f46')}
                  strokeWidth={isSelected ? '3' : '1.2'}
                  strokeLinecap="round"
                />

                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isLight ? '#0f172a' : '#fafaf9'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="6,4"
                    className="animate-path-flow"
                  />
                )}

                {anomaly.trajectory.map(t => {
                  const [px, py] = project(t.lat, t.lon);
                  const isCurrentLead = isSelected && t.lead_time_hours === selectedLeadTime;

                  return (
                    <g
                      key={`pt-${anomaly.track_id}-${t.lead_time_hours}`}
                      className="cursor-pointer transition-transform duration-200 hover:scale-125"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnomaly(anomaly.track_id);
                        onSelectLeadTime(t.lead_time_hours);
                      }}
                    >
                      {isCurrentLead && (
                        <>
                          <circle
                            cx={px}
                            cy={py}
                            r="12"
                            fill="none"
                            stroke={anomaly.hazard_type.includes('heat') ? '#ea580c' : '#e11d48'}
                            strokeWidth="1.5"
                            className="animate-beacon-wave pointer-events-none"
                          />
                          <circle
                            cx={px}
                            cy={py}
                            r="12"
                            fill="none"
                            stroke={anomaly.hazard_type.includes('heat') ? '#ea580c' : '#e11d48'}
                            strokeWidth="1"
                            className="animate-beacon-wave-delayed pointer-events-none"
                          />
                        </>
                      )}

                      <circle
                        cx={px}
                        cy={py}
                        r={isCurrentLead ? '7' : '4'}
                        fill={isCurrentLead ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#ffffff' : '#18181b')}
                        stroke={isSelected ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#64748b' : '#71717a')}
                        strokeWidth="1.5"
                      />

                      <text
                        x={px + 9}
                        y={py + 3}
                        fill={isCurrentLead ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#475569' : '#a1a1aa')}
                        fontSize="9"
                        fontWeight={isCurrentLead ? 'bold' : 'normal'}
                        fontFamily="monospace"
                      >
                        +{t.lead_time_hours}h
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Rotating Radar Sweep Beam */}
          {showRadarSweep && activePtPos && (
            <g
              transform={`translate(${activePtPos[0]}, ${activePtPos[1]})`}
              className="pointer-events-none opacity-40 animate-radar-sweep"
            >
              <path
                d="M 0 0 L 110 -25 A 110 110 0 0 1 110 25 Z"
                fill="url(#radarBeamGradient)"
              />
              <circle
                cx="0"
                cy="0"
                r="110"
                fill="none"
                stroke={isLight ? "rgba(15, 23, 42, 0.2)" : "rgba(245, 245, 244, 0.15)"}
                strokeWidth="0.75"
                strokeDasharray="3,3"
              />
            </g>
          )}

          {/* 5 km Geodesic Radius Alert Polygons */}
          {showRadiusBuffers &&
            alerts.map(alert => {
              const [cx, cy] = project(alert.core.lat, alert.core.lon);
              const polygonCoords = alert.geometry.coordinates[0];
              const svgPoints = polygonCoords.map(coord => project(coord[1], coord[0]).join(',')).join(' ');

              const isSevere = alert.category === 'severe';
              const isModerate = alert.category === 'moderate';
              const isHovered = hoveredAlert?.alert_id === alert.alert_id;

              const strokeColor = isSevere ? '#e11d48' : isModerate ? '#d97706' : '#16a34a';
              const fillColor = isSevere
                ? isLight ? 'rgba(225, 29, 72, 0.32)' : 'rgba(225, 29, 72, 0.25)'
                : isModerate
                ? isLight ? 'rgba(217, 119, 6, 0.28)' : 'rgba(217, 119, 6, 0.20)'
                : isLight ? 'rgba(22, 163, 74, 0.24)' : 'rgba(101, 163, 13, 0.15)';

              const hoveredFillColor = isSevere
                ? isLight ? 'rgba(225, 29, 72, 0.50)' : 'rgba(225, 29, 72, 0.40)'
                : isModerate
                ? isLight ? 'rgba(217, 119, 6, 0.45)' : 'rgba(217, 119, 6, 0.35)'
                : isLight ? 'rgba(22, 163, 74, 0.40)' : 'rgba(101, 163, 13, 0.30)';

              return (
                <g
                  key={`alert-poly-${alert.alert_id}`}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    if (!mapWrapperRef.current) return;
                    const rect = mapWrapperRef.current.getBoundingClientRect();
                    setHoveredAlert(alert);
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (!mapWrapperRef.current) return;
                    const rect = mapWrapperRef.current.getBoundingClientRect();
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredAlert(null);
                  }}
                >
                  <polygon
                    points={svgPoints}
                    fill={isHovered ? hoveredFillColor : fillColor}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? '2.5' : '1.2'}
                    strokeDasharray={isHovered ? 'none' : '2,2'}
                    className="transition-all duration-150"
                  />
                  <circle cx={cx} cy={cy} r={isHovered ? '4' : '2.5'} fill={strokeColor} />
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill={isLight ? "#0f172a" : "#f5f5f4"}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.5"
                    className="pointer-events-none"
                  >
                    5km [{alert.peak_value} {alert.unit}]
                  </text>
                </g>
              );
            })}

          {/* User Query Point and Radius Circle */}
          {queryPoint && (
            <g>
              {(() => {
                const [qx, qy] = project(queryPoint.lat, queryPoint.lon);
                const kmPerPixel = ((maxLat - minLat) * 111) / height;
                const rPix = Math.max(8, queryRadiusKm / kmPerPixel);

                return (
                  <>
                    <circle
                      cx={qx}
                      cy={qy}
                      r={rPix}
                      fill={isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(245, 245, 244, 0.08)"}
                      stroke={isLight ? "#0f172a" : "#f5f5f4"}
                      strokeWidth="1.2"
                      strokeDasharray="3,3"
                    />
                    <circle cx={qx} cy={qy} r="3.5" fill={isLight ? "#0f172a" : "#f5f5f4"} />
                    <text
                      x={qx}
                      y={qy + rPix + 14}
                      textAnchor="middle"
                      fill={isLight ? "#0f172a" : "#e7e5e4"}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Radius: {queryRadiusKm} km ({queryPoint.lat}°N, {queryPoint.lon}°E)
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Interactive Alert Area Tooltip on Hover */}
        {hoveredAlert && tooltipPos && (
          <div
            style={{
              left: Math.min(Math.max(12, tooltipPos.x + 16), (mapWrapperRef.current?.clientWidth || 800) - 290),
              top: Math.min(Math.max(12, tooltipPos.y - 45), (mapWrapperRef.current?.clientHeight || 550) - 230),
            }}
            className={`absolute z-30 pointer-events-none w-72 p-3.5 border backdrop-blur-md shadow-2xl transition-all duration-100 animate-in fade-in zoom-in-95 ${
              isLight
                ? 'bg-white/95 border-stone-300 text-stone-900 shadow-stone-300/80'
                : 'bg-[#141414]/95 border-stone-700 text-stone-100 shadow-black/90'
            }`}
          >
            {/* Category & Alert ID Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hoveredAlert.category === 'severe'
                      ? 'bg-rose-500 animate-pulse'
                      : hoveredAlert.category === 'moderate'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span
                  className={`font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${
                    hoveredAlert.category === 'severe'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                      : hoveredAlert.category === 'moderate'
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {hoveredAlert.category} Alert
                </span>
              </div>
              <span className="font-mono text-[10px] text-stone-500 font-bold">
                {hoveredAlert.alert_id}
              </span>
            </div>

            {/* Peak Value & Rainfall / Heat Probability */}
            <div className={`grid grid-cols-2 gap-2 my-2 py-2 px-2.5 border ${
              isLight ? 'border-stone-200 bg-stone-50/70' : 'border-stone-800 bg-[#1a1a1a]/70'
            }`}>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                  Peak Intensity
                </div>
                <div className="font-serif italic text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {hoveredAlert.peak_value} <span className="text-[11px] font-sans not-italic font-normal text-stone-500">{hoveredAlert.unit}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                  Tail Probability
                </div>
                <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {(hoveredAlert.exceedance_prob * 100).toFixed(0)}% <span className="text-[10px] font-normal text-stone-500">prob</span>
                </div>
              </div>
            </div>

            {/* Validity window & Impact Details */}
            <div className="space-y-1.5 text-[11px] font-mono mt-2">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
                  <Clock className="w-3 h-3 text-stone-400" />
                  Horizon:
                </span>
                <span className="font-medium text-stone-800 dark:text-stone-200 text-[10px]">
                  +{hoveredAlert.lead_time_hours}h Lead Time
                </span>
              </div>
              <div className="text-[10px] text-stone-500 pl-4">
                {hoveredAlert.valid_from.replace('T', ' ').replace('Z', ' UTC')} &rarr; {hoveredAlert.valid_to.replace('T', ' ').replace('Z', ' UTC')}
              </div>

              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 pt-1.5 border-t border-stone-200 dark:border-stone-800">
                <span className="text-[10px] uppercase tracking-wider text-stone-500">Alert Envelope:</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold text-[10px]">
                  {hoveredAlert.core.lat}°N, {hoveredAlert.core.lon}°E (5 km)
                </span>
              </div>

              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span className="text-[10px] uppercase tracking-wider text-stone-500">EFI Reference:</span>
                <span className="text-stone-800 dark:text-stone-200 text-[10px]">
                  {hoveredAlert.efi_reference} Index
                </span>
              </div>
            </div>

            {/* Geodesic note */}
            <div className="mt-2 pt-1.5 border-t border-dashed border-stone-200 dark:border-stone-800 text-[9px] text-stone-400 italic">
              Geodesic 5.0 km impact polygon &bull; Decision support
            </div>
          </div>
        )}

        {/* Legend / Overlay Badge */}
        <div className={`absolute bottom-4 left-4 backdrop-blur-md px-4 py-3 border text-xs space-y-1.5 shadow-xl transition-colors duration-200 ${
          isLight ? 'bg-white/95 border-stone-200 text-stone-700' : 'bg-[#141414]/90 border-[#262626] text-stone-300'
        }`}>
          <div className="font-serif italic text-sm flex items-center justify-between gap-3">
            <span className={`flex items-center gap-1.5 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              <Compass className="w-3.5 h-3.5 text-stone-400" />
              Decision-Support Cartography
            </span>
            {hoverCoords && (
              <span className="font-mono text-[10px] text-stone-500">
                {hoverCoords.lat}°N, {hoverCoords.lon}°E
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-pulse" /> Severe (5km)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-600 inline-block" /> Low
            </span>
          </div>
        </div>

        {/* Lead time scrubber */}
        <div className={`absolute top-4 right-4 backdrop-blur-md px-3.5 py-2 border text-xs shadow-xl flex items-center gap-2.5 transition-colors duration-200 ${
          isLight ? 'bg-white/95 border-stone-200 text-stone-700' : 'bg-[#141414]/90 border-[#262626] text-stone-300'
        }`}>
          <span className={`text-[11px] uppercase tracking-wider font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
            Lead Horizon:
          </span>
          <div className="flex gap-1">
            {[72, 96, 120, 144, 168].map(h => (
              <button
                key={h}
                onClick={() => onSelectLeadTime(h)}
                className={`px-2.5 py-0.5 text-[11px] font-mono transition-all duration-200 ${
                  selectedLeadTime === h
                    ? isLight
                      ? 'bg-stone-900 text-white font-bold scale-105'
                      : 'bg-stone-100 text-stone-950 font-bold scale-105'
                    : isLight
                    ? 'bg-stone-100 text-stone-600 hover:text-stone-950'
                    : 'bg-[#1e1e1e] text-stone-400 hover:text-stone-200'
                }`}
              >
                +{h}h
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
