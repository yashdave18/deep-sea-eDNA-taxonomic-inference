from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.supabase_client import supabase

router = APIRouter()


@router.post("/")
def create_sample(name: str, user=Depends(get_current_user)):
    result = supabase.table("samples").insert({
        "user_id": user["id"],
        "name": name,
        "status": "complete",
    }).execute()
    return result.data


@router.get("/")
def list_samples(user=Depends(get_current_user)):
    result = (
        supabase.table("samples")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{sample_id}")
def get_sample(sample_id: str, user=Depends(get_current_user)):
    result = (
        supabase.table("samples")
        .select("*")
        .eq("id", sample_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sample not found")
    return result.data


@router.delete("/{sample_id}")
def delete_sample(sample_id: str, user=Depends(get_current_user)):
    """Delete a sample and all associated data (taxa_calls, abundance)."""
    # Verify ownership
    result = (
        supabase.table("samples")
        .select("id")
        .eq("id", sample_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sample not found")

    # Delete associated taxa_calls
    supabase.table("taxa_calls").delete().eq("sample_id", sample_id).execute()

    # Delete associated abundance
    supabase.table("abundance").delete().eq("sample_id", sample_id).execute()

    # Delete the sample
    supabase.table("samples").delete().eq("id", sample_id).execute()

    return {"message": "Sample deleted successfully"}