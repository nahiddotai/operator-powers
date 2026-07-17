-- Minimal submissions store. No IPs, no emails, no conversation content.
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('feedback', 'request')),
  skill_id TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  note TEXT CHECK (length(note) <= 1000),
  job TEXT CHECK (length(job) <= 1000),
  category TEXT CHECK (length(category) <= 100),
  created_at TEXT NOT NULL,
  deletion_token_hash TEXT NOT NULL,
  plugin_version TEXT
);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at);
