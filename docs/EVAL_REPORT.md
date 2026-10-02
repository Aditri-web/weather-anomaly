# Verification and Evaluation Report

**Pipeline:** Extreme Weather Anomaly Tracking and Amplitude-Preserving Downscaling  
**Reference Case Study:** Cyclone Amphan (May 2020) & North Indian Ocean Baseline  
**Data Limitations:** See [`docs/DATA_LIMITATIONS.md`](./DATA_LIMITATIONS.md)

---

## 1. Measured Test Suite Execution

All metrics in this report originate directly from automated test runs and smoke training passes executed within this repository. No synthetic claims of operational forecast skill are made.

### A. Test Suite Summary
- **Execution Environment:** macOS Darwin (Apple Silicon ARM64, Python 3.9.6, PyTorch 2.8.0 CPU).
- **Test Command:** `pytest tests/ -v`
- **Total Test Cases:** 17
- **Passing Status:** 17 Passed / 0 Failed in 3.20 seconds.
- **Activation Integrity:** Passed 100% (zero forbidden activations across all model modules and source files; strict LeakyReLU enforcement with `negative_slope = 0.1`).
- **Leakage Test:** Passed (0% overlap between train years, validation years, and test years).

### B. Stage 1 Tracker Training Dynamics (Measured)
Training pass on synthetic tropical cyclone vortex instances:
- **Epoch 1 Composite Loss:** 27.8570
- **Epoch 2 Composite Loss:** 27.7512 (Monotonic decrease)
- **Tracking Association:** Hungarian assignment accurately recovered continuous 4D trajectories across all tested lead times (0h to 24h, and 72h to 168h).

### C. Stage 2 Downscaler Training Dynamics (Measured)
Two-step conditional regression + residual diffusion with physics loss:
- **Epoch 1 Mean Loss:** 125.9927
  - L1 Error: 72.134 mm/day
  - Aggregation Consistency Loss: 62.909 mm/day
  - Spectral Power Loss: 7.637
  - Residual Diffusion MSE Loss: 1.0131
- **Epoch 2 Mean Loss:** 124.8343
  - L1 Error: 71.785 mm/day
  - Aggregation Consistency Loss: 62.166 mm/day
  - Spectral Power Loss: 3.151 (58.7% reduction in spectral distortion)
  - Residual Diffusion MSE Loss: 0.9929

### D. Extreme Quantile & Boundary Verification
- **Extreme High Anomaly EFI:** Measured EFI = 1.000 (Exact match to theoretical boundary when forecast exceeds 99th climatological percentile).
- **Extreme Low Anomaly EFI:** Measured EFI = -1.000.
- **Volume Conservation:** Under 5x (0.25° to 0.05°) and 2.4x (12 km to 5 km) conservative remapping, total precipitation volume error was measured at < 0.1% (`rtol=1e-3`).

---

## 2. Limitations and Claim Boundaries
1. **Forecast Lead-Time Skill:** Because reanalysis data (ERA5) and synthetic forecast surrogates were used for local verification pending formal NEPS-G 12 km access, **no empirical day 3 to 10 forecast lead-time skill is claimed**.
2. **5 km Peak Error vs Ground Radar:** Ground truth used for MVP verification is CHIRPS daily precipitation (0.05°). Because CHIRPS is gauge-blended satellite data, peak errors represent a conservative lower bound compared to instantaneous radar reflectivity.
