"""
Spherical Graph Neural Network (GNN) Tracker.
Complies strictly with activation rules: LeakyReLU everywhere via make_activation().
"""

import torch
import torch.nn as nn
from typing import Dict, Tuple
from src.utils.activations import make_activation


class MeshMessagePassingLayer(nn.Module):
    """
    Message passing on the spherical icosahedral mesh with residual connection and LayerNorm.
    """

    def __init__(self, hidden_dim: int, negative_slope: float = 0.1):
        super().__init__()
        self.edge_mlp = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            make_activation(negative_slope),
            nn.Linear(hidden_dim, hidden_dim),
            make_activation(negative_slope),
        )
        self.node_mlp = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            make_activation(negative_slope),
            nn.Linear(hidden_dim, hidden_dim),
            make_activation(negative_slope),
        )
        self.layer_norm = nn.LayerNorm(hidden_dim)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Node features (N_mesh, hidden_dim)
            edge_index: (2, E)
        """
        src, dst = edge_index[0], edge_index[1]
        edge_feats = torch.cat([x[src], x[dst]], dim=-1)
        messages = self.edge_mlp(edge_feats)

        # Aggregate messages at destination nodes
        aggregated = torch.zeros_like(x)
        aggregated.index_add_(0, dst, messages)

        # Update node features
        updated = self.node_mlp(torch.cat([x, aggregated], dim=-1))
        # Residual + Norm
        return self.layer_norm(x + updated)


class SphericalAnomalyTrackerGNN(nn.Module):
    """
    Encode-Process-Decode Spherical GNN for Extreme Anomaly Tracking.
    
    1. Grid -> Mesh Encoder: Projects 2D lat-lon meteorological features to spherical mesh.
    2. Mesh Processor: K layers of message-passing on icosahedron.
    3. Mesh -> Grid Decoder: Maps mesh representations back to 2D grid.
    4. Prediction Heads:
       - Anomaly probability heatmap (H, W)
       - Anomaly center coordinate regression (lat, lon) and intensity
       - Hazard classification logits
    """

    def __init__(
        self,
        in_channels: int = 5,
        hidden_dim: int = 64,
        num_processor_layers: int = 4,
        negative_slope: float = 0.1,
    ):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.negative_slope = negative_slope

        # 1. Grid Feature Encoder
        self.grid_encoder = nn.Sequential(
            nn.Linear(in_channels, hidden_dim),
            make_activation(negative_slope),
            nn.Linear(hidden_dim, hidden_dim),
            make_activation(negative_slope),
        )

        # 2. Mesh Processor Layers
        self.processor_layers = nn.ModuleList([
            MeshMessagePassingLayer(hidden_dim, negative_slope)
            for _ in range(num_processor_layers)
        ])

        # 3. Mesh to Grid Decoder
        self.grid_decoder = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            make_activation(negative_slope),
            nn.Linear(hidden_dim, hidden_dim),
            make_activation(negative_slope),
        )

        # 4. Heads
        self.anomaly_prob_head = nn.Linear(hidden_dim, 1)

        self.center_intensity_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            make_activation(negative_slope),
            nn.Linear(hidden_dim // 2, 3),  # (center_lat, center_lon, peak_intensity)
        )

        self.hazard_type_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            make_activation(negative_slope),
            nn.Linear(hidden_dim // 2, 3),  # [cyclone/rain, heat, cold]
        )

    def forward(
        self,
        grid_features: torch.Tensor,
        grid_to_mesh_idx: torch.Tensor,
        grid_to_mesh_weights: torch.Tensor,
        mesh_edge_index: torch.Tensor,
        n_mesh_nodes: int,
        grid_shape: Tuple[int, int],
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            grid_features: (B, C, H, W)
            grid_to_mesh_idx: (2, N_conn)
            grid_to_mesh_weights: (N_conn,)
            mesh_edge_index: (2, E)
            n_mesh_nodes: int
            grid_shape: (H, W)
        """
        B, C, H, W = grid_features.shape
        # Flatten spatial dimensions: (B, H*W, C)
        flat_grid = grid_features.permute(0, 2, 3, 1).reshape(B, H * W, C)
        grid_embed = self.grid_encoder(flat_grid)  # (B, H*W, hidden_dim)

        # Map Grid to Mesh nodes
        # grid_to_mesh_idx[0] is grid idx, grid_to_mesh_idx[1] is mesh idx
        g_idx = grid_to_mesh_idx[0]
        m_idx = grid_to_mesh_idx[1]
        w = grid_to_mesh_weights.unsqueeze(-1)  # (N_conn, 1)

        batch_outputs = []
        batch_centers = []
        batch_hazards = []

        for b in range(B):
            mesh_x = torch.zeros(
                (n_mesh_nodes, self.hidden_dim),
                dtype=grid_embed.dtype,
                device=grid_embed.device,
            )
            # Weighted scatter add
            sample_grid = grid_embed[b]  # (H*W, hidden_dim)
            incoming = sample_grid[g_idx] * w
            mesh_x.index_add_(0, m_idx, incoming)

            # Processor
            for layer in self.processor_layers:
                mesh_x = layer(mesh_x, mesh_edge_index)

            # Map Mesh back to Grid
            # Decode using inverse adjacency
            grid_decoded = torch.zeros(
                (H * W, self.hidden_dim),
                dtype=mesh_x.dtype,
                device=mesh_x.device,
            )
            # Scatter mesh features back to grid
            grid_decoded.index_add_(0, g_idx, mesh_x[m_idx] * w)
            grid_out = self.grid_decoder(grid_decoded)

            # Head predictions
            prob_map = torch.sigmoid(self.anomaly_prob_head(grid_out)).reshape(1, 1, H, W)
            batch_outputs.append(prob_map)

            # Global mesh pooling for center & hazard heads
            global_pool = torch.mean(mesh_x, dim=0, keepdim=True)
            batch_centers.append(self.center_intensity_head(global_pool))
            batch_hazards.append(self.hazard_type_head(global_pool))

        return {
            "anomaly_mask": torch.cat(batch_outputs, dim=0),
            "center_intensity": torch.cat(batch_centers, dim=0),
            "hazard_logits": torch.cat(batch_hazards, dim=0),
        }
