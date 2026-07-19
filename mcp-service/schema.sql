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

-- Anonymous usage metrics. install_id is a random UUID generated on the user's
-- machine; it maps to no identity. No IPs, no content, ever.
CREATE TABLE IF NOT EXISTS telemetry_installs (
  install_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  client TEXT,
  os TEXT,
  version TEXT,
  country TEXT
);
CREATE TABLE IF NOT EXISTS telemetry_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  skill TEXT NOT NULL DEFAULT '',
  client TEXT NOT NULL DEFAULT 'unknown',
  country TEXT NOT NULL DEFAULT 'XX',
  version TEXT NOT NULL DEFAULT 'unknown',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, skill, client, country, version)
);
