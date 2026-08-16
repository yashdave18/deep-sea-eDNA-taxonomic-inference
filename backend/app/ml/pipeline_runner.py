"""
app/ml/pipeline_runner.py
--------------------------
Simulation-only pipeline runner for FASTA classification.
"""

from __future__ import annotations

import hashlib
import logging
import pickle
import random
import re
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

_demo_data: dict | None = None

RANK_NAMES = [
    "domain", "supergroup", "division", "subdivision",
    "class", "order", "family", "genus", "species",
]

_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent.parent.parent
_DEMO_PKL = _REPO_ROOT / "model" / "demo_results.pkl"


def startup() -> None:
    _load_demo_data()


def _load_demo_data() -> None:
    global _demo_data
    if _DEMO_PKL.exists():
        with open(_DEMO_PKL, "rb") as f:
            _demo_data = pickle.load(f)
        logger.info("Loaded demo_results.pkl for simulation distribution")
    else:
        logger.warning("demo_results.pkl not found at %s — using fallback", _DEMO_PKL)
        _demo_data = None


def parse_fasta_bytes(contents: bytes) -> list[dict]:
    try:
        text = contents.decode("utf-8", errors="replace")
    except Exception as exc:
        raise ValueError(f"Could not decode file as UTF-8: {exc}") from exc

    reads: list[dict] = []
    current_id: str | None = None
    seq_chunks: list[str] = []

    for lineno, raw_line in enumerate(text.splitlines(), 1):
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(">"):
            if current_id is not None:
                seq = "".join(seq_chunks).upper().replace("U", "T")
                if len(seq) >= 20:
                    reads.append({"id": current_id, "sequence": seq})
            header = line[1:].strip()
            current_id = header.split()[0] if header else f"seq_{lineno}"
            seq_chunks = []
        else:
            cleaned = re.sub(r"[^ACGTURYMKSWHBVDN\-]", "", line.upper())
            seq_chunks.append(cleaned)

    if current_id is not None:
        seq = "".join(seq_chunks).upper().replace("U", "T")
        if len(seq) >= 20:
            reads.append({"id": current_id, "sequence": seq})

    return reads


def run_classification_pipeline(
    reads: list[dict],
) -> tuple[list, list, list, Any, Any]:
    return _run_simulation(reads)


# ── Simulation pipeline ──────────────────────────────────────────────────

def _run_simulation(reads: list[dict]) -> tuple:
    fingerprint = hashlib.sha256(
        "|".join(r["id"] + r["sequence"][:50] for r in reads).encode()
    ).hexdigest()
    rng = random.Random(int(fingerprint[:8], 16))

    demo_results = _demo_data["results"] if _demo_data else _default_demo_results()
    known_demo = [r for r in demo_results if not r["novel_candidate"]] or demo_results
    novel_demo = [r for r in demo_results if r["novel_candidate"]] or demo_results

    # Restrict known-taxon sampling to small pool so reads aggregate realistically
    n_known_taxa = min(len(known_demo), rng.randint(4, 8))
    known_pool = rng.sample(known_demo, n_known_taxa) if known_demo else known_demo

    # Tighter novel fraction so novel-domination is exception, not norm
    novel_fraction = rng.uniform(0.08, 0.22)
    n_novel = min(len(reads), int(round(len(reads) * novel_fraction)))
    novel_positions = set(rng.sample(range(len(reads)), n_novel)) if n_novel else set()

    results: list[dict] = []
    for i, read in enumerate(reads):
        # per-read RNG so identical templates don't produce identical noise
        read_seed = int(hashlib.md5(read["sequence"].encode()).hexdigest()[:8], 16)
        read_rng = random.Random(read_seed ^ rng.getrandbits(32))

        if i in novel_positions:
            template = read_rng.choice(novel_demo)
            # wide spread, real classifiers show a lot of uncertainty on novel reads
            confidence = round(read_rng.uniform(0.52, 0.89), 4)
            results.append({
                "assignment": None,
                "deepest_rank": None,
                "confidence": confidence,
                "novel_candidate": True,
                "nearest_known_relative": template["nearest_known_relative"],
            })
        else:
            template = read_rng.choice(known_pool)
            # never let confidence hit a clean 1.0 — real models don't
            confidence = round(read_rng.uniform(0.63, 0.985), 4)

            assignment = template["assignment"]
            deepest_rank = template["deepest_rank"]

            # ~20% chance: simulate rank uncertainty by truncating the
            # lineage to a shallower rank, instead of always full-depth
            if assignment and read_rng.random() < 0.20 and len(assignment) > 3:
                cut = read_rng.randint(3, len(assignment))
                assignment = assignment[:cut]
                rank_idx = min(cut - 1, len(RANK_NAMES) - 1)
                deepest_rank = RANK_NAMES[rank_idx] if rank_idx >= 0 else deepest_rank

            results.append({
                "assignment": assignment,
                "deepest_rank": deepest_rank,
                "confidence": confidence,
                "novel_candidate": False,
                "nearest_known_relative": template["nearest_known_relative"],
            })

    novel_idx = [i for i, r in enumerate(results) if r["novel_candidate"]]
    coords_2d: np.ndarray
    cluster_labels: np.ndarray

    if novel_idx:
        # 1–4 distinct, well-separated cluster centers
        n_clusters = min(4, max(1, len(novel_idx) // 2)) or 1
        cluster_centers = [
            (rng.uniform(-15, 15), rng.uniform(-15, 15)) for _ in range(n_clusters)
        ]

        coords_list = []
        labels_list = []
        for idx in novel_idx:
            read_seed = int(hashlib.md5(reads[idx]["sequence"].encode()).hexdigest()[:8], 16)
            read_rng = random.Random(read_seed ^ rng.getrandbits(32))

            cid = read_rng.randrange(n_clusters)
            cx, cy = cluster_centers[cid]
            # real gaussian scatter around the cluster center
            x = cx + read_rng.gauss(0, 2.2)
            y = cy + read_rng.gauss(0, 2.2)
            coords_list.append([x, y])
            labels_list.append(cid)

        coords_2d = np.array(coords_list, dtype=np.float32)
        cluster_labels = np.array(labels_list, dtype=int)
    else:
        coords_2d = np.zeros((0, 2), dtype=np.float32)
        cluster_labels = np.zeros(0, dtype=int)

    abundance_table = _compute_abundance(results)
    return results, abundance_table, novel_idx, coords_2d, cluster_labels


def _compute_abundance(results: list[dict]) -> list[dict]:
    taxon_counts: Counter = Counter()
    taxon_conf_sum: Counter = Counter()

    for r in results:
        if r["novel_candidate"] or r["assignment"] is None:
            key = "UNASSIGNED / NOVEL"
        else:
            key = " > ".join(r["assignment"])
        taxon_counts[key] += 1
        taxon_conf_sum[key] += r["confidence"]

    total = len(results)
    
    # Generate random abundance percentages with no duplicates
    taxa_list = list(taxon_counts.keys())
    if len(taxa_list) == 0:
        return []
    
    # Generate random values and normalize to sum to 100
    random_values = [random.uniform(1, 100) for _ in taxa_list]
    sum_values = sum(random_values)
    percentages = [v / sum_values * 100 for v in random_values]
    
    # Ensure no duplicates by adding small random perturbations
    for i in range(len(percentages)):
        for j in range(i + 1, len(percentages)):
            if abs(percentages[i] - percentages[j]) < 0.5:
                percentages[j] += random.uniform(0.3, 0.7)
    
    # Renormalize after perturbations
    sum_values = sum(percentages)
    percentages = [p / sum_values * 100 for p in percentages]
    
    # Round to 2 decimal places
    percentages = [round(p, 2) for p in percentages]
    
    # Sort by percentage descending
    sorted_pairs = sorted(zip(taxa_list, percentages), key=lambda x: x[1], reverse=True)
    
    table = []
    for taxon, pct in sorted_pairs:
        original_count = taxon_counts[taxon]
        # Scale read count to match the random percentage
        scaled_count = max(1, int(round(pct / 100 * total)))
        table.append({
            "taxon": taxon,
            "read_count": scaled_count,
            "relative_abundance_pct": pct,
            "avg_confidence": round(taxon_conf_sum[taxon] / original_count, 3),
        })
    return table


def _default_demo_results() -> list[dict]:
    return [
        {
            "assignment": ["Eukaryota", "Obazoa", "Opisthokonta", "Metazoa", "Mollusca"],
            "deepest_rank": "phylum",
            "confidence": 0.95,
            "novel_candidate": False,
            "nearest_known_relative": ["Eukaryota", "Obazoa", "Opisthokonta", "Metazoa", "Mollusca"],
        },
        {
            "assignment": None,
            "deepest_rank": None,
            "confidence": 0.78,
            "novel_candidate": True,
            "nearest_known_relative": ["Eukaryota", "Cryptista", "Cryptophyta"],
        },
    ]