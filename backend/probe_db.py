from app.supabase_client import supabase

USER_ID = "3efa4ed2-f9d7-4745-be6e-4038849050c0"

for table in ("samples", "taxa_calls", "abundance"):
    try:
        r = supabase.table(table).select("*").limit(1).execute()
        keys = list((r.data or [{}])[0].keys()) if r.data else "(empty)"
        print(f"{table}: OK keys={keys}")
    except Exception as e:
        print(f"{table}: {e}")

# probe sample columns via insert dry-run
try:
    r = supabase.table("samples").select("id,name,status,read_count,created_at").limit(1).execute()
    print("samples columns probe:", r.data)
except Exception as e:
    print("samples status/read_count:", e)
