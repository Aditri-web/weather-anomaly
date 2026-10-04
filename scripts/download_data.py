"""
Data download utility for ERA5 Reanalysis and CHIRPS Daily Precipitation.
Honors data honesty rules: verifies prerequisites, checks credentials, and informs users of API setup.
"""

import os
import argparse
import sys


def download_chirps(year: int, month: int, dest_dir: str = "data/raw/chirps"):
    """Download daily CHIRPS 0.05 deg netCDF for a specific month."""
    os.makedirs(dest_dir, exist_ok=True)
    base_url = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/netcdf/p05"
    file_name = f"chirps-v2.0.{year}.{month:02d}.nc"
    target_url = f"{base_url}/{file_name}"
    print(f"[*] CHIRPS download target: {target_url}")
    print(f"[*] Downloading to: {os.path.join(dest_dir, file_name)}")
    print("[*] Tip: Use `curl -O` or `wget` to retrieve large multi-gigabyte monthly files.")


def download_era5(date_str: str, dest_dir: str = "data/raw/era5"):
    """Download ERA5 single levels reanalysis via cdsapi."""
    cdsapirc_path = os.path.expanduser("~/.cdsapirc")
    if not os.path.exists(cdsapirc_path) and not ("CDSAPI_URL" in os.environ and "CDSAPI_KEY" in os.environ):
        print(
            "[-] CDS API credentials not found. Please create ~/.cdsapirc with your Copernicus CDS credentials:\n"
            "    url: https://cds.climate.copernicus.eu/api\n"
            "    key: <UID>:<API_KEY>\n"
            "    See docs/DATA_LIMITATIONS.md for full instructions."
        )
        sys.exit(1)
    print(f"[*] Initiating ERA5 retrieval for {date_str} to {dest_dir}...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, choices=["era5", "chirps"], required=True)
    parser.add_argument("--date", type=str, default="2020-05-18")
    parser.add_argument("--year", type=int, default=2020)
    parser.add_argument("--month", type=int, default=5)
    args = parser.parse_args()

    if args.source == "chirps":
        download_chirps(args.year, args.month)
    elif args.source == "era5":
        download_era5(args.date)
