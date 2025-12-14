-- Migration: Add Treasury column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "Treasury" text;
-- Optionally, add a comment for clarity
COMMENT ON COLUMN transactions."Treasury" IS 'مكان الخزينة المختار من النموذج (Treasury selected from the form)';
