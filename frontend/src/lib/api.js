import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** Retrieve the current user's access token from the active Supabase session. */
async function getToken() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) throw new Error('Not authenticated')
  return session.access_token
}

/** Generic authenticated fetch wrapper. Throws on 4xx/5xx. */
async function apiFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (res.status === 401) {
    // Token expired or rejected by backend — sign out and force re-login
    await supabase.auth.signOut()
    window.location.href = '/'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const body = await res.text()
    // Try to extract FastAPI's detail field for human-readable errors
    try {
      const json = JSON.parse(body)
      throw new Error(json.detail || `API error ${res.status}`)
    } catch {
      throw new Error(`API error ${res.status}: ${body}`)
    }
  }
  return res.json()
}

// ── Samples ──────────────────────────────────────────────────────────────────

/** List all samples for the authenticated user (newest first). */
export async function getSamples() {
  return apiFetch('/samples/')
}

/**
 * Get a single sample by ID.
 * @returns {Promise<{id, name, status, read_count, created_at}>}
 */
export async function getSample(sampleId) {
  return apiFetch(`/samples/${sampleId}`)
}

/**
 * Delete a sample and all associated data.
 * @returns {Promise<{message: string}>}
 */
export async function deleteSample(sampleId) {
  return apiFetch(`/samples/${sampleId}`, { method: 'DELETE' })
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Get all taxa_calls for a sample.
 * @returns {Promise<Array<{id, read_id, taxonomy, confidence, is_novel, deepest_rank, nearest_known_relative, umap_x, umap_y, embedding_cluster_id}>>}
 */
export async function getTaxaCalls(sampleId) {
  return apiFetch(`/pipeline/results/${sampleId}`)
}

/**
 * Get abundance table for a sample (sorted by relative_abundance_pct desc).
 * @returns {Promise<Array<{taxon, read_count, relative_abundance_pct, avg_confidence}>>}
 */
export async function getAbundance(sampleId) {
  return apiFetch(`/pipeline/abundance/${sampleId}`)
}

/**
 * Get novel-candidate reads for UMAP scatter.
 * @returns {Promise<Array<{id, read_id, umap_x, umap_y, embedding_cluster_id, confidence, nearest_known_relative, deepest_rank}>>}
 */
export async function getNovelClusters(sampleId) {
  return apiFetch(`/pipeline/novel/${sampleId}`)
}

/**
 * Compare samples across all user's samples for heatmap visualization.
 * @returns {Promise<{samples: Array<{id, name, code}>, taxa: Array<{taxon, values}>}>}
 */
export async function compareSamples() {
  return apiFetch('/pipeline/compare')
}

/**
 * Upload a FASTA file and run the classification pipeline.
 *
 * Uses FormData (multipart) so the browser sets the correct Content-Type
 * boundary automatically — do NOT set Content-Type manually here.
 *
 * @param {File}   file        — the FASTA File object from the input/drop
 * @param {string} sampleName  — display name for the sample
 * @returns {Promise<{sample_id: string, status: string, read_count: number}>}
 */
export async function uploadSample(file, sampleName) {
  const token = await getToken()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('sample_name', sampleName)

  const res = await fetch(
    `${BASE_URL}/pipeline/upload?sample_name=${encodeURIComponent(sampleName)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      // No Content-Type header — browser sets multipart/form-data + boundary
      body: formData,
    }
  )

  if (res.status === 401) {
    await supabase.auth.signOut()
    window.location.href = '/'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.text()
    try {
      const json = JSON.parse(body)
      throw new Error(json.detail || `Upload failed (${res.status})`)
    } catch (parseErr) {
      if (parseErr.message.startsWith('Upload failed') || parseErr.message.startsWith('Upload')) {
        throw parseErr
      }
      throw new Error(`Upload failed (${res.status}): ${body}`)
    }
  }

  return res.json()
}
