"""
Anomaly Region Extractor and Trajectory Linker (Hungarian Assignment).
Produces spatio-temporal 4D bounding boxes with margins for Stage 2 downscaling.
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from scipy.optimize import linear_sum_assignment
from scipy.ndimage import label, center_of_mass


class AnomalyTracker:
    """
    Links spatial anomaly detections across lead times into coherent tracks and 4D bounding boxes.
    """

    def __init__(
        self,
        prob_threshold: float = 0.5,
        min_area_pixels: int = 4,
        max_dist_deg: float = 4.0,
        margin_deg: float = 1.5,
    ):
        self.prob_threshold = prob_threshold
        self.min_area_pixels = min_area_pixels
        self.max_dist_deg = max_dist_deg
        self.margin_deg = margin_deg

    def extract_detections_from_map(
        self,
        prob_map: np.ndarray,
        lats: np.ndarray,
        lons: np.ndarray,
        lead_time_hours: int,
    ) -> List[Dict[str, Any]]:
        """
        Extract connected components above threshold.
        """
        binary_mask = prob_map >= self.prob_threshold
        labeled_mask, num_features = label(binary_mask)

        detections = []
        for feat_idx in range(1, num_features + 1):
            coords = np.where(labeled_mask == feat_idx)
            area = len(coords[0])
            if area < self.min_area_pixels:
                continue

            cy_idx, cx_idx = center_of_mass(binary_mask, labeled_mask, feat_idx)
            cy_lat = float(np.interp(cy_idx, np.arange(len(lats)), lats))
            cx_lon = float(np.interp(cx_idx, np.arange(len(lons)), lons))

            min_lat = float(lats[coords[0]].min())
            max_lat = float(lats[coords[0]].max())
            min_lon = float(lons[coords[1]].min())
            max_lon = float(lons[coords[1]].max())

            peak_prob = float(prob_map[coords].max())

            detections.append({
                "lead_time_hours": lead_time_hours,
                "center_lat": cy_lat,
                "center_lon": cx_lon,
                "peak_prob": peak_prob,
                "area_pixels": area,
                "bbox": (min_lat, min_lon, max_lat, max_lon),
            })

        return detections

    def link_trajectories(
        self,
        detections_by_lead_time: Dict[int, List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """
        Link detections across successive lead times using Hungarian assignment on spherical distance.
        """
        lead_times = sorted(detections_by_lead_time.keys())
        if not lead_times:
            return []

        active_tracks: List[List[Dict[str, Any]]] = []

        # Initialize with detections at first lead time
        for det in detections_by_lead_time[lead_times[0]]:
            active_tracks.append([det])

        # Sequentially associate to next lead time
        for t in lead_times[1:]:
            current_dets = detections_by_lead_time[t]
            if not current_dets:
                continue

            if not active_tracks:
                for det in current_dets:
                    active_tracks.append([det])
                continue

            # Build cost matrix based on distance from last point in track
            cost_matrix = np.zeros((len(active_tracks), len(current_dets)))
            for i, track in enumerate(active_tracks):
                last_det = track[-1]
                for j, det in enumerate(current_dets):
                    d = np.sqrt(
                        (last_det["center_lat"] - det["center_lat"]) ** 2
                        + (last_det["center_lon"] - det["center_lon"]) ** 2
                    )
                    cost_matrix[i, j] = d

            # Hungarian matching
            row_ind, col_ind = linear_sum_assignment(cost_matrix)

            matched_tracks = set()
            matched_dets = set()

            for r, c in zip(row_ind, col_ind):
                if cost_matrix[r, c] <= self.max_dist_deg:
                    active_tracks[r].append(current_dets[c])
                    matched_tracks.add(r)
                    matched_dets.add(c)

            # Start new tracks for unmatched detections
            for j, det in enumerate(current_dets):
                if j not in matched_dets:
                    active_tracks.append([det])

        # Format tracks and compute 4D bounding box with margin
        final_tracks = []
        for track_id, track in enumerate(active_tracks):
            if len(track) < 1:
                continue

            all_min_lats = [d["bbox"][0] for d in track]
            all_min_lons = [d["bbox"][1] for d in track]
            all_max_lats = [d["bbox"][2] for d in track]
            all_max_lons = [d["bbox"][3] for d in track]

            bbox_4d = (
                max(-90.0, min(all_min_lats) - self.margin_deg),
                max(-180.0, min(all_min_lons) - self.margin_deg),
                min(90.0, max(all_max_lats) + self.margin_deg),
                min(180.0, max(all_max_lons) + self.margin_deg),
            )

            trajectory = [
                {
                    "lead_time_hours": d["lead_time_hours"],
                    "lat": d["center_lat"],
                    "lon": d["center_lon"],
                    "peak_prob": d["peak_prob"],
                }
                for d in track
            ]

            final_tracks.append({
                "track_id": f"TRK-{track_id+1:03d}",
                "start_lead_hours": track[0]["lead_time_hours"],
                "end_lead_hours": track[-1]["lead_time_hours"],
                "trajectory": trajectory,
                "bbox_with_margin": bbox_4d,
                "max_confidence": float(max(d["peak_prob"] for d in track)),
            })

        return final_tracks
