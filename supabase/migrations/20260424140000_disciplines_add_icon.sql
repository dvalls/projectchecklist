-- Add icon column to cl_disciplines to store a Lucide icon name (e.g. "Droplets", "Zap")
ALTER TABLE cl_disciplines
  ADD COLUMN IF NOT EXISTS icon text;
