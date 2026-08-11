CREATE TABLE IF NOT EXISTS newsletter_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_newsletter_attempts_updated
  ON newsletter_attempts(updated_at);
