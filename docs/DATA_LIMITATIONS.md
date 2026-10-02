# Data Limitations and Source Specifications

This document outlines the source provenance, resolution, frequency, licence, known biases, and claim boundaries for all datasets used or interfaced in this pipeline.

---

## 1. Primary Datasets

### A. ERA5 Reanalysis (Coarse Baseline & Climatology)
- **Source:** Copernicus Climate Change Service (C3S) / ECMWF via CDS API.
- **Resolution:** 0.25° x 0.25° (~28 km at equator), hourly.
- **Role:** Climatological baseline (30 years, 1991–2020), coarse meteorological input during initial training, historical event testing (e.g., Cyclone Amphan May 2020).
- **Licence:** Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Known Biases:** Known to underestimate extreme convective precipitation peaks and tropical cyclone core winds compared to radar/gauge observations.
- **Claim Boundaries:** Can support reanalysis-referenced anomaly scoring and historical downscaling verification. **Cannot support operational forecast lead-time skill claims (day 3 to 10)**.

### B. CHIRPS Daily Precipitation (High-Resolution Target)
- **Source:** Climate Hazards Center (UC Santa Barbara) / USGS.
- **Resolution:** 0.05° x 0.05° (~5.3 km), daily accumulations (00:00 to 23:59 UTC or local 24h).
- **Role:** Supervised training target for Stage 2 downscaler.
- **Licence:** Public Domain / Open Data.
- **Known Biases:** Gauge-blended satellite product; while vastly superior to 0.25° reanalysis, it smooths out ultra-localized flash convective cloudburst peaks compared to ground radar. Peak errors against CHIRPS represent a conservative *lower bound* on downscaling difficulty.
- **Claim Boundaries:** Supports daily accumulation downscaling (mm/day). **Does not support sub-daily/hourly peak intensity claims**.

### C. NEPS-G (NCMRWF Ensemble Prediction System - Global)
- **Source:** National Centre for Medium Range Weather Forecasting (NCMRWF), India.
- **Resolution:** ~12 km horizontal resolution, 23 ensemble members (1 control + 22 perturbed), forecasts out to 10 days.
- **Status:** **Stub interface (`NepsGSource`)** pending formal data access agreement.
- **Claim Boundaries:** Forecast lead-time skill can only be evaluated once NEPS-G data is connected.

### D. NCUM / IMDAA / Ground Doppler Radar
- **Status:** Stubs (`NcumSource`, `ImdaaSource`, `RadarSource`) raising `NotImplementedError`.

---

## 2. Data Access Setup Instructions

### CDS API (ERA5 Download)
To download ERA5 data:
1. Register at `https://cds.climate.copernicus.eu/`
2. Create `~/.cdsapirc` containing:
   ```
   url: https://cds.climate.copernicus.eu/api
   key: <UID>:<API-KEY>
   ```
3. Set in environment: `CDSAPI_URL` and `CDSAPI_KEY`.

### CHIRPS Download
CHIRPS GeoTIFF/NetCDF files are publicly downloadable via HTTP/FTP:
- Base URL: `https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/netcdf/p05/`
- No authentication required.
