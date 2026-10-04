# Integrating NEPS-G 12 km Forecast Archives

This guide specifies the exact files and configuration parameters to modify when formal NCMRWF NEPS-G 12 km ensemble access is granted.

---

## 1. What Needs Changing

No model architecture code needs to be modified. The pipeline is designed around abstract `DataSource` interfaces and config-driven non-integer resolution handling.

### Step 1: Implement `NepsGSource` in `src/data/sources.py`
Replace the stub in `src/data/sources.py`:
```python
class NepsGSource(DataSource):
    def __init__(self, data_dir: str = "data/raw/neps_g"):
        self.data_dir = data_dir

    def get_source_name(self) -> str:
        return "neps_g_12km"

    def load_field(self, date_str: str, lead_time_hours: int = 0, bbox=None) -> Dict[str, Any]:
        # Open NEPS-G GRIB2/NetCDF cycle file via xarray
        # e.g.: ds = xr.open_dataset(f"{self.data_dir}/nepsg_{date_str}_f{lead_time_hours:03d}.grib2", engine="cfgrib")
        # Extract ensemble array (23 members, lat, lon)
        ...
```

### Step 2: Switch `configs/data.yaml`
Update `configs/data.yaml`:
```yaml
sources:
  forecast_ensemble: "neps_g_12km"  # Changed from synthetic_forecast

resolution:
  input_deg: 0.108   # ~12 km at equator
  target_deg: 0.05   # ~5 km target grid
  scale_factor: 2.4  # Non-integer 12 km -> 5 km scaling
```

### Step 3: Run the Non-Integer Scale Verification
The non-integer 2.4x conservative remapping path is already implemented and validated in `src/data/regrid.py` and `tests/test_regrid.py`.
Verify that the incoming grid matches:
```bash
pytest tests/test_regrid.py -k test_conservative_regrid_non_integer_scale
```
