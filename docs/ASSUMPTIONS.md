# Project Assumptions Log

This document records all domain, technical, and operational assumptions made during the design and implementation of the extreme weather anomaly tracking and downscaling pipeline.

## 1. Domain & Geography

- **Domain Scope (MVP):** Bay of Bengal and East Coast of India (Odisha, Andhra Pradesh, West Bengal).
  - Bounding Box: Latitude `[10.0°N, 25.0°N]`, Longitude `[80.0°E, 95.0°E]`.
  - Resolution: Coarse grid ~0.25° (approx 25-28 km) / 12 km NEPS-G. Target downscaled grid: ~0.05° (~5 km) or 5 km equidistant regional projection.
- **Hazard Focus (MVP):** Tropical Cyclones and Heavy Precipitation systems.
- **Variable (MVP):** Total Precipitation (`tp` in mm/day or mm/lead-time accumulation).

## 2. Data Sources & Limitations

- **Coarse Input (ERA5):** Serves as reanalysis baseline and historical test case input when NEPS-G forecasts are pending access. When using ERA5 reanalysis data, lead time is treated as 0 h or synthetic lead-time offset; no true forecast lead-time skill (day 3-10) is claimed on reanalysis data alone.
- **High-Resolution Target (CHIRPS):** Climate Hazards Group InfraRed Precipitation with Station data (CHIRPS) is provided at 0.05° daily resolution. Since CHIRPS is daily accumulated, downscaled predictions are daily accumulations (mm/day). Sub-daily (hourly) extremes are not claimed with CHIRPS target.
- **Climatology & EFI:** EFI is computed against a 30-year climatological window (±15 days around target date). Because reference climatology is reanalysis-derived (ERA5), it is designated as a "reanalysis-referenced anomaly index" in all outputs.

## 3. Modeling Assumptions

- **Stage 1 (Tracker):**
  - Spherical icosahedral mesh provides uniform spatial sampling across latitudes without pole singularities.
  - Summarized ensemble statistics (mean, spread, 10th, 50th, 90th quantiles) are passed to the GNN to bound memory footprint on a single 16 GB GPU.
- **Stage 2 (Downscaler):**
  - CorrDiff two-step paradigm: deterministic regression U-Net for conditional mean + conditional diffusion model for residual high-frequency details.
  - Precipitation non-negativity is preserved by `log1p(x)` forward transform and `expm1(y).clamp(min=0.0)` inverse transform, NOT via output ReLU.
  - Patch-based inference with cosine-tapered overlap blending handles arbitrarily large spatial domains within GPU VRAM limits.
- **Activation Functions:** LeakyReLU with default negative slope of 0.1 is used exclusively across all layers (encoders, processors, decoders, U-Nets, diffusion blocks) to prevent dying neurons and guarantee non-zero gradient propagation in heavy-tailed extreme distributions.
- **Physics Constraints:** Aggregation consistency `||Pool(y) - x_coarse||` acts as a soft conservation penalty during training and verification. It is not an absolute mathematical conservation guarantee.
