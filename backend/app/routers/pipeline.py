import asyncio
import random
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Request

from app.auth import get_current_user
from app.config import settings
from app.supabase_client import supabase
from app.ml import pipeline_runner
from app.ml.row_builders import build_taxa_rows, build_abundance_rows

router = APIRouter()

ALLOWED_EXTENSIONS = {".fasta", ".fa", ".fna"}


def _assert_sample_ownership(sample_id: str, user_id: str):
    """Verify the sample exists and belongs to the requesting user."""
    result = (
        supabase.table("samples")
        .select("id")
        .eq("id", sample_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sample not found or access denied")


# ── Read results endpoints ────────────────────────────────────────────────────

@router.get("/results/{sample_id}")
def get_results(sample_id: str, user=Depends(get_current_user)):
    _assert_sample_ownership(sample_id, user["id"])
    result = (
        supabase.table("taxa_calls")
        .select("*")
        .eq("sample_id", sample_id)
        .execute()
    )
    return result.data


@router.get("/abundance/{sample_id}")
def get_abundance(sample_id: str, user=Depends(get_current_user)):
    _assert_sample_ownership(sample_id, user["id"])
    result = (
        supabase.table("abundance")
        .select("*")
        .eq("sample_id", sample_id)
        .order("relative_abundance_pct", desc=True)
        .execute()
    )
    return result.data


@router.get("/novel/{sample_id}")
def get_novel(sample_id: str, user=Depends(get_current_user)):
    _assert_sample_ownership(sample_id, user["id"])
    result = (
        supabase.table("taxa_calls")
        .select(
            "id, read_id, umap_x, umap_y, embedding_cluster_id, confidence, "
            "nearest_known_relative, deepest_rank"
        )
        .eq("sample_id", sample_id)
        .eq("is_novel", True)
        .execute()
    )
    return result.data


@router.get("/compare")
def compare_samples(user=Depends(get_current_user)):
    """
    Returns abundance data across ALL of the current user's samples,
    shaped for a taxa x sample heatmap.
    """
    # Get all sample ids + short display codes for this user (limit to most recent 10)
    samples_result = (
        supabase.table("samples")
        .select("id, name, created_at")
        .eq("user_id", user["id"])
        .eq("status", "complete")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    samples = samples_result.data

    if not samples:
        return {"samples": [], "taxa": []}

    sample_ids = [s["id"] for s in samples]

    # Get abundance rows for all those samples in one query
    abundance_result = (
        supabase.table("abundance")
        .select("*")
        .in_("sample_id", sample_ids)
        .execute()
    )
    abundance_rows = abundance_result.data

    # Assign each sample a short display code (S1, S2, etc.)
    sample_codes = {}
    for i, s in enumerate(samples):
        sample_codes[s["id"]] = f"S{i+1}"

    # Pivot into { taxon: { sample_code: relative_abundance_pct } }
    pivot = {}
    for row in abundance_rows:
        taxon = row["taxon"]
        code = sample_codes.get(row["sample_id"])
        if not code:
            continue
        pivot.setdefault(taxon, {})[code] = row["relative_abundance_pct"]

    # Limit to top 20 taxa by average abundance across samples
    taxa_avg_abundance = {}
    for taxon, values in pivot.items():
        if values:
            taxa_avg_abundance[taxon] = sum(values.values()) / len(values)

    top_taxa = sorted(taxa_avg_abundance.items(), key=lambda x: x[1], reverse=True)[:20]
    top_taxon_names = {taxon for taxon, _ in top_taxa}

    filtered_pivot = {
        taxon: values
        for taxon, values in pivot.items()
        if taxon in top_taxon_names
    }

    return {
        "samples": [
            {"id": s["id"], "name": s["name"], "code": sample_codes[s["id"]]}
            for s in samples
        ],
        "taxa": [
            {"taxon": taxon, "values": values}
            for taxon, values in filtered_pivot.items()
        ],
    }


# ── Upload & run pipeline ─────────────────────────────────────────────────────

@router.post("/upload")
async def upload_and_run(
    request: Request,
    file: UploadFile,
    sample_name: str,
    user=Depends(get_current_user),
):
    """
    Upload a FASTA file, run the classification pipeline, and store results.

    Returns {sample_id, status, read_count} on success.
    """

    # 1. Validate file size before reading (Content-Length hint where available)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large. Maximum allowed size is "
                f"{settings.MAX_UPLOAD_BYTES // 1_048_576} MB."
            ),
        )

    # 2. Validate extension
    filename = file.filename or ""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext or '(none)'}'. "
                "Please upload a .fasta, .fa, or .fna file."
            ),
        )

    # 3. Read file contents (enforce hard size cap post-read as well)
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large ({len(contents) // 1024} KB). "
                f"Maximum allowed size is {settings.MAX_UPLOAD_BYTES // 1_048_576} MB."
            ),
        )

    # 4. Parse and validate FASTA content
    try:
        reads = pipeline_runner.parse_fasta_bytes(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FASTA file: {exc}") from exc

    if len(reads) == 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "No valid sequences found in the uploaded file. "
                "Ensure the file is in FASTA format with sequences at least 20 bases long."
            ),
        )

    # 5. Create sample row with status="processing"
    sample_insert = (
        supabase.table("samples")
        .insert({
            "user_id": user["id"],
            "name": sample_name.strip() or filename,
            "status": "processing",
            "read_count": len(reads),
        })
        .execute()
    )
    if not sample_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create sample record.")

    sample_id: str = sample_insert.data[0]["id"]

    # 6. Simulate processing time (4-10 seconds)
    processing_delay = random.uniform(4, 10)
    await asyncio.sleep(processing_delay)

    # 7. Run the ML pipeline
    try:
        results, abundance_table, novel_idx, coords_2d, cluster_labels = (
            pipeline_runner.run_classification_pipeline(reads)
        )
    except Exception as exc:
        # Mark sample as failed so the dashboard shows the right badge
        supabase.table("samples").update({"status": "failed"}).eq("id", sample_id).execute()
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed: {exc}",
        ) from exc

    # 7. Insert taxa_calls (use shared row builder — identical shape to demo data)
    try:
        read_ids = [r["id"] for r in reads]
        taxa_rows = build_taxa_rows(
            sample_id, results, novel_idx, coords_2d, cluster_labels, read_ids
        )
        # Supabase has a row limit per insert; batch in chunks of 500
        _batch_insert(supabase, "taxa_calls", taxa_rows)
    except Exception as exc:
        supabase.table("samples").update({"status": "failed"}).eq("id", sample_id).execute()
        raise HTTPException(status_code=500, detail=f"Failed to store taxa results: {exc}") from exc

    # 8. Insert abundance
    try:
        abundance_rows = build_abundance_rows(sample_id, abundance_table)
        _batch_insert(supabase, "abundance", abundance_rows)
    except Exception as exc:
        supabase.table("samples").update({"status": "failed"}).eq("id", sample_id).execute()
        raise HTTPException(status_code=500, detail=f"Failed to store abundance results: {exc}") from exc

    # 9. Mark sample complete
    supabase.table("samples").update({"status": "complete"}).eq("id", sample_id).execute()

    return {
        "sample_id": sample_id,
        "status": "complete",
        "read_count": len(reads),
    }


def _batch_insert(client, table: str, rows: list[dict], chunk_size: int = 500) -> None:
    """Insert rows in chunks to stay within Supabase's per-request limits."""
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        client.table(table).insert(chunk).execute()


# ── Legacy stub (kept for backward compat, now superseded by /upload) ─────────

@router.post("/run/{sample_id}")
async def run_pipeline(sample_id: str, file: UploadFile, user=Depends(get_current_user)):
    """Deprecated stub — use POST /pipeline/upload instead."""
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use POST /pipeline/upload instead.",
    )