"""
Icosahedral spherical mesh generator and bipartite grid-mesh mappings.
Avoids polar distortions and projection edge artifacts of regular 2D grids.
"""

from typing import Tuple, List, Dict
import numpy as np
import torch
import torch.nn as nn


def generate_base_icosahedron() -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate initial 12 vertices and 20 triangular faces of a regular icosahedron on the unit sphere.
    """
    phi = (1.0 + np.sqrt(5.0)) / 2.0  # Golden ratio
    # 12 vertices
    verts = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ]
    verts = np.array(verts, dtype=np.float32)
    # Project to unit sphere
    verts = verts / np.linalg.norm(verts, axis=1, keepdims=True)

    # 20 triangular faces
    faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ]
    faces = np.array(faces, dtype=np.int64)
    return verts, faces


def subdivide_mesh(verts: np.ndarray, faces: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Subdivide each triangular face into 4 smaller triangles and project new vertices to sphere.
    """
    midpoint_cache: Dict[Tuple[int, int], int] = {}
    new_verts = list(verts)

    def get_midpoint(i1: int, i2: int) -> int:
        edge = (min(i1, i2), max(i1, i2))
        if edge in midpoint_cache:
            return midpoint_cache[edge]
        mid = (verts[i1] + verts[i2]) / 2.0
        mid = mid / np.linalg.norm(mid)  # Project to unit sphere
        idx = len(new_verts)
        new_verts.append(mid)
        midpoint_cache[edge] = idx
        return idx

    new_faces = []
    for f in faces:
        v0, v1, v2 = f[0], f[1], f[2]
        m01 = get_midpoint(v0, v1)
        m12 = get_midpoint(v1, v2)
        m20 = get_midpoint(v2, v0)

        new_faces.extend([
            [v0, m01, m20],
            [v1, m12, m01],
            [v2, m20, m12],
            [m01, m12, m20],
        ])

    return np.array(new_verts, dtype=np.float32), np.array(new_faces, dtype=np.int64)


def build_icosahedral_mesh(refinement_level: int = 2) -> Dict[str, np.ndarray]:
    """
    Generate an icosahedral spherical mesh with hierarchical edges.
    Level 0: 12 nodes
    Level 1: 42 nodes
    Level 2: 162 nodes
    Level 3: 642 nodes
    """
    verts, faces = generate_base_icosahedron()
    for _ in range(refinement_level):
        verts, faces = subdivide_mesh(verts, faces)

    # Extract unique undirected edges
    edge_set = set()
    for f in faces:
        edge_set.add((min(f[0], f[1]), max(f[0], f[1])))
        edge_set.add((min(f[1], f[2]), max(f[1], f[2])))
        edge_set.add((min(f[2], f[0]), max(f[2], f[0])))

    # Make bidirectional
    src, dst = [], []
    for u, v in edge_set:
        src.extend([u, v])
        dst.extend([v, u])

    edge_index = np.array([src, dst], dtype=np.int64)

    # Convert 3D Cartesian coordinates to Lat/Lon in radians and degrees
    x, y, z = verts[:, 0], verts[:, 1], verts[:, 2]
    lat_rad = np.arcsin(np.clip(z, -1.0, 1.0))
    lon_rad = np.arctan2(y, x)
    lats_deg = np.degrees(lat_rad)
    lons_deg = np.degrees(lon_rad)

    return {
        "vertices": verts,
        "faces": faces,
        "edge_index": edge_index,
        "lats_deg": lats_deg,
        "lons_deg": lons_deg,
        "num_nodes": len(verts),
    }


def build_bipartite_mapping(
    grid_lats: np.ndarray,
    grid_lons: np.ndarray,
    mesh_lats: np.ndarray,
    mesh_lons: np.ndarray,
    k_nearest: int = 3,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Compute bipartite graph connections between flat lat-lon grid and spherical mesh nodes.
    Uses great-circle distance on the sphere.
    
    Returns:
        grid_to_mesh_indices: (2, N_connections) [grid_flat_idx, mesh_node_idx]
        grid_to_mesh_weights: (N_connections,) normalized interpolation weights
    """
    grid_lat_rad = np.radians(grid_lats)
    grid_lon_rad = np.radians(grid_lons)
    mesh_lat_rad = np.radians(mesh_lats)
    mesh_lon_rad = np.radians(mesh_lons)

    # Flatten 2D grid
    lon_mesh, lat_mesh = np.meshgrid(grid_lon_rad, grid_lat_rad)
    flat_grid_lat = lat_mesh.flatten()
    flat_grid_lon = lon_mesh.flatten()
    n_grid = len(flat_grid_lat)
    n_mesh = len(mesh_lat_rad)

    # Compute pairwise haversine distance for k-nearest neighbors
    # For efficiency and memory safety on CPU/GPU:
    # d = 2 * arcsin(sqrt(sin^2(dlat/2) + cos(lat1)*cos(lat2)*sin^2(dlon/2)))
    grid_xyz = np.stack([
        np.cos(flat_grid_lat) * np.cos(flat_grid_lon),
        np.cos(flat_grid_lat) * np.sin(flat_grid_lon),
        np.sin(flat_grid_lat),
    ], axis=1)  # (N_grid, 3)

    mesh_xyz = np.stack([
        np.cos(mesh_lat_rad) * np.cos(mesh_lon_rad),
        np.cos(mesh_lat_rad) * np.sin(mesh_lon_rad),
        np.sin(mesh_lat_rad),
    ], axis=1)  # (N_mesh, 3)

    # Dot product similarity (equivalent to cosine of spherical distance)
    # Cos(dist) = x1*x2 + y1*y2 + z1*z2
    similarity = np.dot(grid_xyz, mesh_xyz.T)  # (N_grid, N_mesh)

    # Find k nearest mesh nodes for each grid cell
    nearest_mesh_indices = np.argsort(-similarity, axis=1)[:, :k_nearest]  # (N_grid, k)

    grid_indices = np.repeat(np.arange(n_grid), k_nearest)
    mesh_indices = nearest_mesh_indices.flatten()

    # Inverse distance weighting
    cos_dists = np.take_along_axis(similarity, nearest_mesh_indices, axis=1)
    angular_dist = np.arccos(np.clip(cos_dists, -1.0, 1.0)) + 1e-4
    weights = 1.0 / angular_dist
    weights = weights / np.sum(weights, axis=1, keepdims=True)

    edge_index = torch.tensor(np.stack([grid_indices, mesh_indices], axis=0), dtype=torch.long)
    edge_weights = torch.tensor(weights.flatten(), dtype=torch.float32)

    return edge_index, edge_weights
