import { AnomalySummary, AlertItem, DownscaledResponse, Coordinates } from '../types/weather';

export const MOCK_CYCLES = ['2026-10-01T00Z', '2026-10-01T12Z', '2026-10-02T00Z'];

export const MOCK_ANOMALIES: AnomalySummary[] = [
  {
    track_id: 'TRK-001',
    name: 'Bay of Bengal Deep Depression / Cyclone Severe Rainband',
    hazard_type: 'cyclone_heavy_rain',
    start_lead_hours: 72,
    end_lead_hours: 168,
    max_confidence: 0.94,
    trajectory: [
      { lead_time_hours: 72, lat: 14.8, lon: 85.2, peak_prob: 0.88, peak_value: 135.0, hazard_metric: '135 mm/d' },
      { lead_time_hours: 96, lat: 16.3, lon: 86.1, peak_prob: 0.92, peak_value: 164.5, hazard_metric: '164.5 mm/d' },
      { lead_time_hours: 120, lat: 18.1, lon: 86.9, peak_prob: 0.94, peak_value: 192.0, hazard_metric: '192 mm/d' },
      { lead_time_hours: 144, lat: 19.9, lon: 87.4, peak_prob: 0.89, peak_value: 178.0, hazard_metric: '178 mm/d' },
      { lead_time_hours: 168, lat: 21.6, lon: 88.1, peak_prob: 0.84, peak_value: 145.0, hazard_metric: '145 mm/d' },
    ],
    bbox_with_margin: [13.0, 83.0, 23.0, 90.0],
    climatology_baseline: 'ERA5 30-Year Oct Climatology (1991-2020)',
    efi_score: 0.94,
    status: 'active',
  },
  {
    track_id: 'TRK-002',
    name: 'Indo-Gangetic Basin Extreme Heat Dome',
    hazard_type: 'extreme_heat_dome',
    start_lead_hours: 72,
    end_lead_hours: 144,
    max_confidence: 0.91,
    trajectory: [
      { lead_time_hours: 72, lat: 27.8, lon: 77.1, peak_prob: 0.84, peak_value: 46.2, hazard_metric: '46.2 °C' },
      { lead_time_hours: 96, lat: 28.6, lon: 77.8, peak_prob: 0.89, peak_value: 47.8, hazard_metric: '47.8 °C' },
      { lead_time_hours: 120, lat: 29.4, lon: 78.5, peak_prob: 0.92, peak_value: 49.3, hazard_metric: '49.3 °C' },
      { lead_time_hours: 144, lat: 29.9, lon: 79.2, peak_prob: 0.88, peak_value: 47.5, hazard_metric: '47.5 °C' },
    ],
    bbox_with_margin: [26.0, 75.0, 31.5, 81.0],
    climatology_baseline: 'IMDAA Reanalysis 1980-2020 Tmax',
    efi_score: 0.91,
    status: 'active',
  },
  {
    track_id: 'TRK-003',
    name: 'Western Ghats Orographic Convective Burst',
    hazard_type: 'monsoon_deluge',
    start_lead_hours: 48,
    end_lead_hours: 120,
    max_confidence: 0.87,
    trajectory: [
      { lead_time_hours: 48, lat: 13.8, lon: 74.9, peak_prob: 0.80, peak_value: 125.0, hazard_metric: '125 mm/d' },
      { lead_time_hours: 72, lat: 14.9, lon: 74.6, peak_prob: 0.86, peak_value: 172.0, hazard_metric: '172 mm/d' },
      { lead_time_hours: 96, lat: 16.1, lon: 74.2, peak_prob: 0.88, peak_value: 205.0, hazard_metric: '205 mm/d' },
      { lead_time_hours: 120, lat: 17.2, lon: 73.8, peak_prob: 0.82, peak_value: 155.0, hazard_metric: '155 mm/d' },
    ],
    bbox_with_margin: [12.5, 73.0, 18.0, 76.5],
    climatology_baseline: 'ERA5 High-Res Precipitation Climatology',
    efi_score: 0.88,
    status: 'monitoring',
  },
];

/**
 * Generates geodesic 5km radius polygon coordinates adhering to AlertEngine rules
 */
export function generateGeodesicCircle(lat: number, lon: number, radiusKm: number = 5.0): number[][] {
  const latRadiusDeg = radiusKm / 111.0;
  const lonRadiusDeg = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180.0) + 1e-6);
  const numPoints = 32;
  const coords: number[][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const ptLon = Number((lon + lonRadiusDeg * Math.cos(angle)).toFixed(5));
    const ptLat = Number((lat + latRadiusDeg * Math.sin(angle)).toFixed(5));
    coords.push([ptLon, ptLat]);
  }
  return coords;
}

export let MOCK_ALERTS: AlertItem[] = [
  {
    alert_id: 'ALT-TRK-001-LT096',
    anomaly_id: 'TRK-001',
    type: 'cyclone_heavy_rain',
    category: 'severe',
    lead_time_hours: 96,
    valid_from: '2026-10-05T00:00Z',
    valid_to: '2026-10-05T12:00Z',
    core: { lat: 16.3, lon: 86.1 },
    radius_km: 5.0,
    geometry: {
      type: 'Polygon',
      coordinates: [generateGeodesicCircle(16.3, 86.1, 5.0)],
    },
    peak_value: 164.5,
    unit: 'mm/day',
    exceedance_prob: 0.82,
    efi_reference: 0.92,
    disclaimer: 'Decision support for forecasters; thresholds subject to domain agreement.',
  },
  {
    alert_id: 'ALT-TRK-001-LT120',
    anomaly_id: 'TRK-001',
    type: 'cyclone_heavy_rain',
    category: 'severe',
    lead_time_hours: 120,
    valid_from: '2026-10-06T00:00Z',
    valid_to: '2026-10-06T12:00Z',
    core: { lat: 18.1, lon: 86.9 },
    radius_km: 5.0,
    geometry: {
      type: 'Polygon',
      coordinates: [generateGeodesicCircle(18.1, 86.9, 5.0)],
    },
    peak_value: 192.0,
    unit: 'mm/day',
    exceedance_prob: 0.89,
    efi_reference: 0.94,
    disclaimer: 'Decision support for forecasters; thresholds subject to domain agreement.',
  },
  {
    alert_id: 'ALT-TRK-002-LT120',
    anomaly_id: 'TRK-002',
    type: 'extreme_heat_dome',
    category: 'severe',
    lead_time_hours: 120,
    valid_from: '2026-10-06T06:00Z',
    valid_to: '2026-10-06T18:00Z',
    core: { lat: 29.4, lon: 78.5 },
    radius_km: 5.0,
    geometry: {
      type: 'Polygon',
      coordinates: [generateGeodesicCircle(29.4, 78.5, 5.0)],
    },
    peak_value: 49.3,
    unit: '°C',
    exceedance_prob: 0.92,
    efi_reference: 0.95,
    disclaimer: 'Decision support for forecasters; thresholds subject to domain agreement.',
  },
  {
    alert_id: 'ALT-TRK-003-LT096',
    anomaly_id: 'TRK-003',
    type: 'monsoon_deluge',
    category: 'severe',
    lead_time_hours: 96,
    valid_from: '2026-10-05T00:00Z',
    valid_to: '2026-10-05T24:00Z',
    core: { lat: 16.1, lon: 74.2 },
    radius_km: 5.0,
    geometry: {
      type: 'Polygon',
      coordinates: [generateGeodesicCircle(16.1, 74.2, 5.0)],
    },
    peak_value: 205.0,
    unit: 'mm/day',
    exceedance_prob: 0.88,
    efi_reference: 0.89,
    disclaimer: 'Decision support for forecasters; thresholds subject to domain agreement.',
  },
  {
    alert_id: 'ALT-TRK-001-LT144',
    anomaly_id: 'TRK-001',
    type: 'cyclone_heavy_rain',
    category: 'moderate',
    lead_time_hours: 144,
    valid_from: '2026-10-07T00:00Z',
    valid_to: '2026-10-07T12:00Z',
    core: { lat: 19.9, lon: 87.4 },
    radius_km: 5.0,
    geometry: {
      type: 'Polygon',
      coordinates: [generateGeodesicCircle(19.9, 87.4, 5.0)],
    },
    peak_value: 88.5,
    unit: 'mm/day',
    exceedance_prob: 0.46,
    efi_reference: 0.76,
    disclaimer: 'Decision support for forecasters; thresholds subject to domain agreement.',
  },
];

/**
 * Generate 2D simulated precipitation field for comparison
 * Demonstrates amplitude preservation:
 * Coarse 12km (averaged over cells)
 * Diffusion downscaling (sharp convective cores, peak 192 mm/d)
 * Plain U-Net regression baseline (blurred down to ~118 mm/d due to L2 loss)
 */
export function generateFieldComparison(anomalyId: string, leadTimeHours: number): DownscaledResponse {
  const anomaly = MOCK_ANOMALIES.find(a => a.track_id === anomalyId) || MOCK_ANOMALIES[0];
  const targetPt = anomaly.trajectory.find(t => t.lead_time_hours === leadTimeHours) || anomaly.trajectory[1];

  const peak = targetPt.peak_value || 164.5;
  const isHeat = anomaly.hazard_type.includes('heat');
  const unit = isHeat ? '°C' : 'mm/day';
  const varName = isHeat ? '2m_temperature_anomaly' : 'total_precipitation';

  // Generate 8x8 coarse and 16x16 downscaled matrices centered around targetPt
  const coarseGridSize = 8;
  const fineGridSize = 16;
  const coarseMatrix: number[][] = [];
  const fineMatrix: number[][] = [];
  const lats: number[] = [];
  const lons: number[] = [];

  const centerI = 8;
  const centerJ = 8;

  for (let i = 0; i < fineGridSize; i++) {
    const row: number[] = [];
    const lat = Number((targetPt.lat - 0.75 + (i * 1.5) / fineGridSize).toFixed(3));
    lats.push(lat);

    for (let j = 0; j < fineGridSize; j++) {
      const dist = Math.sqrt(Math.pow(i - centerI, 2) + Math.pow(j - centerJ, 2));
      // Convective core with fine-scale non-Gaussian gradient
      const bell = Math.exp(-Math.pow(dist / 2.8, 2));
      const microPerturbation = Math.sin(i * 1.7) * Math.cos(j * 1.4) * 0.12 * bell;
      const val = Number((peak * (bell + microPerturbation)).toFixed(1));
      row.push(Math.max(0, val));
    }
    fineMatrix.push(row);
  }

  for (let i = 0; i < coarseGridSize; i++) {
    const row: number[] = [];
    const cLat = Number((targetPt.lat - 0.75 + (i * 1.5) / coarseGridSize).toFixed(3));
    if (i < fineGridSize / 2) lons.push(Number((targetPt.lon - 0.75 + (i * 1.5) / coarseGridSize).toFixed(3)));

    for (let j = 0; j < coarseGridSize; j++) {
      // Coarse 12km averages the 2x2 fine sub-blocks
      const sub1 = fineMatrix[i * 2][j * 2];
      const sub2 = fineMatrix[i * 2 + 1][j * 2];
      const sub3 = fineMatrix[i * 2][j * 2 + 1];
      const sub4 = fineMatrix[i * 2 + 1][j * 2 + 1];
      const avg = Number(((sub1 + sub2 + sub3 + sub4) / 4).toFixed(1));
      row.push(avg);
    }
    coarseMatrix.push(row);
  }

  // Calculate comparative statistics
  const diffusionPeak = peak;
  const coarsePeak = Math.max(...coarseMatrix.flat());
  // Regression baseline typically smooths peak by 25-35% due to spectral blur
  const regressionBlurredPeak = Number((diffusionPeak * 0.68).toFixed(1));

  return {
    anomaly_id: anomaly.track_id,
    lead_time_hours: targetPt.lead_time_hours,
    grid_resolution_km: 5.0,
    variable: varName,
    unit: unit,
    mean_peak_value: Number((diffusionPeak * 0.82).toFixed(1)),
    max_peak_value: diffusionPeak,
    high_impact_area_sqkm: 7850.0,
    exceedance_threshold_mm: isHeat ? 45.0 : 50.0,
    coarse_grid_size: [coarseGridSize, coarseGridSize],
    downscaled_grid_size: [fineGridSize, fineGridSize],
    comparison_data: {
      diffusion_peak: diffusionPeak,
      regression_blurred_peak: regressionBlurredPeak,
      coarse_12km_peak: coarsePeak,
      power_spectrum_ratio: 0.984, // high frequency preserved near 1.0
      physics_conservation_score: 0.992, // mass/energy conservation under downsampling
    },
    grid_matrix_preview: {
      coarse: coarseMatrix,
      downscaled: fineMatrix,
      lats,
      lons,
    },
  };
}

/**
 * Filter alerts by query params
 */
export function queryAlerts(
  category?: string,
  minLead?: number,
  maxLead?: number,
  point?: Coordinates,
  radiusKm?: number
): AlertItem[] {
  let results = [...MOCK_ALERTS];

  if (category) {
    results = results.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }
  if (minLead !== undefined) {
    results = results.filter(a => a.lead_time_hours >= minLead);
  }
  if (maxLead !== undefined) {
    results = results.filter(a => a.lead_time_hours <= maxLead);
  }
  if (point) {
    const maxRadius = radiusKm ?? 25.0;
    results = results.filter(a => {
      const dLat = (a.core.lat - point.lat) * 111.0;
      const dLon = (a.core.lon - point.lon) * 111.0 * Math.cos((point.lat * Math.PI) / 180.0);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      return dist <= maxRadius;
    });
  }

  return results;
}

/**
 * Simulate running the full 2-stage pipeline on demand
 */
export function runSyntheticForecastPipeline(cycleId?: string): {
  cycle: string;
  detected_anomalies: number;
  new_alerts_generated: number;
  stages: { name: string; duration_ms: number; status: string }[];
} {
  const cycle = cycleId || `2026-10-02T${new Date().getUTCHours().toString().padStart(2, '0')}:00Z`;

  return {
    cycle,
    detected_anomalies: MOCK_ANOMALIES.length,
    new_alerts_generated: MOCK_ALERTS.length,
    stages: [
      { name: 'Stage 0: Preprocessing & ERA5 30-Year EFI Computation', duration_ms: 340, status: 'completed' },
      { name: 'Stage 1: Spherical Icosahedral Mesh GNN Anomaly Tracker', duration_ms: 610, status: 'completed' },
      { name: 'Stage 2: Conditional Diffusion Downscaler (12km -> 5km DDIM 25 steps)', duration_ms: 1250, status: 'completed' },
      { name: 'Stage 3: Physics Constraints Verification (Mass & Moisture Flux)', duration_ms: 180, status: 'verified' },
      { name: 'Stage 4: Geodesic 5 km Alert Buffer Categorization & GeoJSON Generation', duration_ms: 95, status: 'published' },
    ],
  };
}
