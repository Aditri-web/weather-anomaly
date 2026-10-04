# Project Status & Tracking

**Last Updated:** 2026-10-02
**Current Milestone:** Initial Repository & Pipeline Setup

## Phase Progress

| Phase | Description | Status | Verification & Evidence |
|---|---|---|---|
| **Phase 0** | Plan, Architecture, Dependencies, Assumptions & Source Verification | **COMPLETED** | Pinned dependencies, verified CHIRPS/ERA5 specifications, documented CDS/NOAA credentials, bounding boxes |
| **Phase 1** | Data Foundation: DataSource/TargetSource interfaces, EFI, Synthetic Generators, Regridding | **COMPLETED** | Passes unit tests; hand-computed EFI test verified; conservative/bilinear regridding operational |
| **Phase 2** | Stage 1 Tracker: Icosahedral Multi-mesh GNN, Anomaly Detection & Trajectory Linking | **COMPLETED** | Loss decreases on synthetic moving cyclone blob; Hungarian assignment links 4D bounding boxes |
| **Phase 3** | Stage 2 Downscaler: Conditional Residual Diffusion (CorrDiff style), LeakyReLU factory | **COMPLETED** | DDIM sampler verified; 12km to 5km regrid path operational; log1p/expm1 non-negative precipitation |
| **Phase 4** | Physics-informed Losses & Anti-Hallucination Constraints | **COMPLETED** | Aggregation consistency, spectral power loss, quantile/tail-weighted loss, hallucination guard tested |
| **Phase 5** | Alert Engine & Serving REST API (FastAPI) | **COMPLETED** | All routes (`/health`, `/v1/anomalies`, `/v1/alerts`, etc.) tested with httpx test client |
| **Phase 6** | Kaggle/Colab Training Notebooks & Documentation | **COMPLETED** | `notebooks/train_kaggle.ipynb`, `notebooks/train_colab.ipynb`, `docs/EVAL_REPORT.md`, `docs/NEPSG_INTEGRATION.md` |

## Code Compliance Checklist

- [x] **Activation Function Rule:** LeakyReLU everywhere via `src/utils/activations.py` (`make_activation()`). Plain ReLU, GELU, SiLU, Mish, ELU strictly forbidden. Tested in `tests/test_no_relu.py`.
- [x] **Data Honesty:** Stubs for unsupplied sources (`NepsGSource`, `NcumSource`, `ImdaaSource`, `RadarSource`) raising explicit `NotImplementedError`.
- [x] **No Fabricated Numbers:** Measured results only.
- [x] **Leakage Prevention:** Split by event and year, tested in `tests/test_leakage.py`.
- [x] **Fast CPU Smoke Tests:** Entire test suite runs in under 2 minutes on CPU.
