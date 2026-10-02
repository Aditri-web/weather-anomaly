# Extreme Weather Anomaly Tracking and Amplitude-Preserving Downscaling

An AI pipeline that finds extreme weather anomalies (cyclones, heat domes, cold waves) in global ensemble forecasts, tracks them over a 3 to 10 day window, and downscales the affected region from 12 km to 5 km **without smoothing away the extreme peaks**. A REST API and dashboard turn the result into categorised, hyper-local alerts.

> See [`architecture.md`](./architecture.md) for the full technical design and [section 15](#15-product-requirements-document-prd) for the product requirements (PRD).

---

## Table of contents

1. [Problem](#1-problem)
2. [Solution at a glance](#2-solution-at-a-glance)
3. [Key features](#3-key-features)
4. [How it works](#4-how-it-works)
5. [Tech stack](#5-tech-stack)
6. [Data](#6-data)
7. [Repository structure](#7-repository-structure)
8. [Quick start](#8-quick-start)
9. [API overview](#9-api-overview)
10. [Evaluation](#10-evaluation)
11. [Roadmap](#11-roadmap)
12. [Known gaps and open questions](#12-known-gaps-and-open-questions)
13. [Societal impact](#13-societal-impact)
14. [References](#14-references)
15. [Product Requirements Document (PRD)](#15-product-requirements-document-prd)

---

## 1. Problem

- Locating extreme weather footprints in large global NWP outputs is computationally heavy and still depends on manual interpretation.
- In **medium-range forecasting (3 to 10 days)**, atmospheric chaos makes single deterministic runs unreliable, so ensembles are needed.
- Standard deep-learning models (plain CNNs, U-Nets) trained on mean-error losses suffer **spectral smoothing**: they average out the high-intensity peaks of rainfall and wind that forecasters actually need.
- There is a gap between coarse **12 km global ensemble** data and localised, high-fidelity threat tracking.

## 2. Solution at a glance

A two-stage hybrid pipeline:

| Stage | Goal | Method |
|---|---|---|
| **1. Track** | Find where the anomaly is and where it moves | Graph neural network on an icosahedral spherical mesh, working on Extreme Forecast Index (EFI) fields from the ensemble |
| **2. Downscale** | Get a 5 km impact map that keeps extreme amplitudes | Conditional diffusion model with physics-informed loss terms, applied to the region Stage 1 isolates |
| **3. Serve** | Make it usable | REST alerting API (low / moderate / severe within a 5 km radius) plus a map dashboard |

```
NEPS-G 12 km ensemble ──► Stage 1: GNN tracker ──► anomaly boxes + trajectories
                                                        │
                                                        ▼
                                  Stage 2: diffusion downscaler (12 km → 5 km)
                                                        │
                                                        ▼
                                   Alert engine ──► REST API + Dashboard
```

## 3. Key features

- **Ensemble-native:** processes multivariable 4D ensemble data (member × time × lat × lon × variable) instead of a single run.
- **Spherical-aware tracking:** an icosahedral mesh avoids the polar and projection distortions of flat 2D grids.
- **Climatology-relative detection:** anomalies are scored against a 30-year ERA5 baseline, so "extreme" means extreme for that place and season.
- **Amplitude-preserving downscaling:** generative (diffusion) sampling produces realistic high-intensity peaks instead of blurred means.
- **Physics-informed:** soft penalties discourage physically inconsistent outputs (for example heavy rain without moisture convergence).
- **Probabilistic output:** multiple diffusion samples give an uncertainty band, not just one map.
- **Actionable alerts:** categorised alerts for a 5 km radius around the anomaly core, with a time window.

## 4. How it works

1. **Ingest** NEPS-G ensemble forecasts (GRIB2/NetCDF) and open them lazily with Xarray and Dask.
2. **Compute EFI** per grid point against the ERA5/IMDAA climatology (and optionally Shift of Tails, SOT).
3. **Build the mesh graph:** map the 12 km grid onto an icosahedral mesh (grid → mesh encoder, mesh message passing, mesh → grid decoder).
4. **Detect and track:** the GNN outputs an anomaly mask and a centre for each lead time; a tracker links detections across lead times into trajectories and spatio-temporal bounding boxes.
5. **Crop and condition:** the box (plus margin) is regridded and fed to the diffusion model together with static fields (orography, land-sea mask).
6. **Downscale:** the diffusion model generates N samples at 5 km; the ensemble of samples gives a mean, a peak map and an exceedance probability.
7. **Alert:** thresholds on the downscaled fields and EFI assign a category (low, moderate, severe) around the core point.
8. **Serve:** results are stored and exposed via the REST API and shown on the dashboard.

## 5. Tech stack

| Area | Tools |
|---|---|
| Deep learning | PyTorch (JAX optional), custom physics-guided losses |
| Graph networks | PyTorch Geometric / DGL |
| Generative downscaling | Conditional diffusion (DDPM / EDM-style) |
| Data handling | Xarray, Dask, NetCDF4, cfgrib / eccodes for GRIB2, Zarr for caching |
| Meteorology | MetPy (thermodynamics, derived fields), xesmf / scipy for regridding |
| Geospatial / plotting | Cartopy, GeoPandas, Shapely |
| Backend | FastAPI, Uvicorn, Pydantic |
| Storage | Zarr / NetCDF on object storage; PostgreSQL + PostGIS for alerts and tracks |
| Frontend | React, MapLibre GL or Leaflet, deck.gl for gridded layers |
| MLOps | Weights & Biases or MLflow, DVC for data versioning |
| Packaging | Docker, Docker Compose; GitHub Actions for CI |

## 6. Data

| Role | Dataset | Notes |
|---|---|---|
| Climatology baseline | ERA5 and/or IMDAA reanalysis, about 30 years | Used for EFI and anomaly scoring |
| Forecast input | NEPS-G (12 km global ensemble) | Main model input |
| Deterministic reference | NCUM (12 km) | Optional extra context |
| Event library | Cyclone Amphan, severe North India heatwaves, others | Used for training, validation and demos |
| Static fields | Orography, land-sea mask, land cover | Conditioning for downscaling |
| **High-resolution target** | **CHIRPS (0.05° ~ 5km)** for MVP; confirmed and public | Supervised target for Stage 2 |

## 7. Repository structure

```
weather-anomaly/
├── README.md
├── architecture.md
├── configs/                 # YAML configs (data, mesh, models, training, alerts)
├── data/                    # (git-ignored) raw, interim, processed, zarr cache
├── notebooks/               # exploration and demos (train_kaggle.ipynb, train_colab.ipynb)
├── src/
│   ├── data/                # loaders, regridding, EFI, climatology, datasets
│   ├── mesh/                # icosahedral mesh + grid<->mesh mappings
│   ├── models/
│   │   ├── tracker/         # Stage 1 GNN
│   │   └── downscaler/      # Stage 2 diffusion
│   ├── physics/             # physics-informed loss terms
│   ├── tracking/            # detection linking, trajectories, bounding boxes
│   ├── alerts/              # thresholds, categories, radius logic
│   ├── eval/                # metrics and verification
│   └── utils/               # activations (LeakyReLU factory), logging, etc.
├── api/                     # FastAPI app
├── scripts/                 # train, infer, evaluate, export
├── tests/
├── docker/
└── docs/
```

## 8. Quick start

```bash
# 1. Environment
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Run Smoke Tests (under 2 minutes on CPU)
pytest tests/ -v

# 3. Train Stage 1 (GNN tracker)
python scripts/train_tracker.py --config configs/tracker.yaml

# 4. Train Stage 2 (Diffusion downscaler)
python scripts/train_downscaler.py --config configs/downscaler.yaml

# 5. Run full pipeline inference
python scripts/infer.py --config configs/infer.yaml

# 6. Start Alerting API
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## 9. API overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness and status |
| GET | `/v1/anomalies` | Active anomalies for a forecast cycle |
| GET | `/v1/anomalies/{id}` | One anomaly with per-lead-time details |
| GET | `/v1/anomalies/{id}/downscaled` | 5 km fields (mean, peak, exceedance) |
| POST | `/v1/alerts/query` | Alerts for a point or polygon with radius |
| GET | `/v1/alerts` | Current alerts with filters |
| GET | `/v1/cycles` | Available forecast cycles |
