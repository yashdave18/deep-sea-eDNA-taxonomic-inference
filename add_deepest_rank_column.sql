-- Add deepest_rank column to taxa_calls table
ALTER TABLE taxa_calls ADD COLUMN IF NOT EXISTS deepest_rank text;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_taxa_calls_deepest_rank ON taxa_calls(deepest_rank);
