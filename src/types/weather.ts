export interface Coordinates {
  lat: number;
  lon: number;
}

export interface TrajectoryPoint {
  lead_time_hours: number;
  lat: number;
  lon: number;
  peak_prob: number;
  peak_value?: number;
  hazard_metric?: string;
}

export interface AnomalySummary {
  track_id: string;
  name: string;
  hazard_type: string;
  start_lead_hours: number;
  end_lead_hours: number;
  max_confidence: number;
  trajectory: TrajectoryPoint[];
  bbox_with_margin: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  climatology_baseline: string;
  efi_score: number;
  status: 'active' | 'monitoring' | 'resolved';
}

export interface AlertItem {
  alert_id: string;
  anomaly_id: string;
  type: string;
  category: 'low' | 'moderate' | 'severe';
  lead_time_hours: number;
  valid_from: string;
  valid_to: string;
  core: Coordinates;
  radius_km: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  peak_value: number;
  unit: string;
  exceedance_prob: number;
  efi_reference?: number;
  disclaimer: string;
}

export interface AlertQueryRequest {
  point?: Coordinates;
  radius_km?: number;
  category?: string;
  min_lead_time_hours?: number;
  max_lead_time_hours?: number;
}

export interface DownscaledResponse {
  anomaly_id: string;
  lead_time_hours: number;
  grid_resolution_km: number;
  variable: string;
  unit: string;
  mean_peak_value: number;
  max_peak_value: number;
  high_impact_area_sqkm: number;
  exceedance_threshold_mm: number;
  coarse_grid_size: [number, number];
  downscaled_grid_size: [number, number];
  comparison_data?: {
    diffusion_peak: number;
    regression_blurred_peak: number;
    coarse_12km_peak: number;
    power_spectrum_ratio: number;
    physics_conservation_score: number;
  };
  grid_matrix_preview?: {
    coarse: number[][];
    downscaled: number[][];
    lats: number[];
    lons: number[];
  };
}

export interface HealthStatus {
  status: string;
  version: string;
  last_cycle: string;
  active_anomalies_count: number;
  active_alerts_count: number;
  ensemble_members_loaded: number;
  diffusion_sampler: string;
}
