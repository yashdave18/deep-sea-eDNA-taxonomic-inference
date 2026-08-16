"""
app/ml/row_builders.py
----------------------
Shared functions that convert pipeline output into Supabase-ready row dicts.
Used by both the live upload endpoint AND any seed/demo scripts, so the storage
shape is guaranteed identical — no divergence between demo data and real uploads.

Pipeline output format (from notebook):
  results       — list of dicts with keys:
                  assignment, deepest_rank, confidence, novel_candidate,
                  nearest_known_relative   (list of taxonomy strings)
  abundance_table — list of dicts:
                  taxon, read_count, relative_abundance_pct, avg_confidence
  novel_idx     — list of int indices into results that are novel
  coords_2d     — numpy array shape (len(novel_idx), 2), UMAP coordinates
  cluster_labels — numpy array shape (len(novel_idx),), HDBSCAN labels

PR2 taxonomy rank order (9 levels):
  domain, supergroup, division, subdivision, class, order, family, genus, species
"""

from __future__ import annotations

import uuid
from typing import Any

# Rank names matching the PR2 taxonomy hierarchy used in the notebook
RANK_NAMES = [
    "domain", "supergroup", "division", "subdivision",
    "class", "order", "family", "genus", "species",
]


def _taxonomy_list_to_dict(tax_list: list | None) -> dict | None:
    """Convert a flat list of taxonomy strings into a keyed dict.

    The notebook stores taxonomy as a list aligned with RANK_NAMES.
    Supabase stores it as JSONB so we key it for readability in queries.
    """
    if not tax_list:
        return None
    result = {}
    for i, rank in enumerate(RANK_NAMES):
        if i < len(tax_list) and tax_list[i]:
            result[rank] = tax_list[i]
    return result or None


def build_taxa_rows(
    sample_id: str,
    results: list[dict],
    novel_idx: list[int],
    coords_2d: Any,          # numpy array (len(novel_idx), 2) or None
    cluster_labels: Any,     # numpy array (len(novel_idx),) or None
    read_ids: list[str] | None = None,
) -> list[dict]:
    """Build taxa_calls rows ready for Supabase insert.

    Args:
        sample_id:     UUID of the parent sample row.
        results:       Pipeline classification output list.
        novel_idx:     Indices (into results) that are novel candidates.
        coords_2d:     UMAP 2-D coordinates for novel reads (or None).
        cluster_labels: HDBSCAN cluster label per novel read (or None).
        read_ids:      Optional list of read IDs aligned with results.
                       Falls back to "read_{i}" if None.
    """
    # Build O(1) lookup: result_index -> (umap_x, umap_y, cluster_id)
    novel_meta: dict[int, dict] = {}
    if novel_idx and coords_2d is not None and cluster_labels is not None:
        for j, idx in enumerate(novel_idx):
            novel_meta[idx] = {
                "umap_x": float(coords_2d[j][0]),
                "umap_y": float(coords_2d[j][1]),
                "embedding_cluster_id": int(cluster_labels[j]),
            }

    rows = []
    for i, r in enumerate(results):
        read_id = read_ids[i] if read_ids and i < len(read_ids) else f"read_{i}"
        is_novel = bool(r.get("novel_candidate", False))

        # Convert flat taxonomy list to keyed dict for JSONB storage
        taxonomy = _taxonomy_list_to_dict(r.get("assignment"))
        nearest = _taxonomy_list_to_dict(r.get("nearest_known_relative"))

        row: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "sample_id": sample_id,
            "read_id": read_id,
            "taxonomy": taxonomy,
            "deepest_rank": r.get("deepest_rank"),
            "confidence": r.get("confidence"),
            "is_novel": is_novel,
            "nearest_known_relative": nearest,
            "umap_x": None,
            "umap_y": None,
            "embedding_cluster_id": None,
        }

        # Attach UMAP coords / cluster for novel reads
        if is_novel and i in novel_meta:
            row.update(novel_meta[i])

        rows.append(row)

    return rows


def build_abundance_rows(sample_id: str, abundance_table: list[dict]) -> list[dict]:
    """Build abundance rows ready for Supabase insert.

    Each entry in abundance_table has:
      taxon, read_count, relative_abundance_pct, avg_confidence
    """
    rows = []
    for entry in abundance_table:
        rows.append({
            "id": str(uuid.uuid4()),
            "sample_id": sample_id,
            "taxon": entry.get("taxon", "Unknown"),
            "read_count": int(entry.get("read_count", 0)),
            "relative_abundance_pct": float(entry.get("relative_abundance_pct", 0.0)),
            "avg_confidence": float(entry.get("avg_confidence", 0.0)),
        })
    return rows
