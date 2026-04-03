PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  unlock_mode TEXT NOT NULL DEFAULT 'none',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS error_items (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  notebook_id TEXT NOT NULL,
  question_text TEXT,
  answer_text TEXT,
  analysis_text TEXT,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ai_status TEXT NOT NULL DEFAULT 'idle',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS error_images (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  error_item_id TEXT NOT NULL,
  local_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (error_item_id) REFERENCES error_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(owner_profile_id, name)
);

CREATE TABLE IF NOT EXISTS error_item_tags (
  error_item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (error_item_id, tag_id),
  FOREIGN KEY (error_item_id) REFERENCES error_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_records (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  error_item_id TEXT NOT NULL,
  result TEXT NOT NULL,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (error_item_id) REFERENCES error_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_tasks (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL,
  error_item_id TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at INTEGER,
  last_error TEXT,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (error_item_id) REFERENCES error_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_error_items_notebook_mastery_updated
  ON error_items(owner_profile_id, notebook_id, mastery_level, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_records_item_created
  ON review_records(owner_profile_id, error_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_status_retry
  ON ai_tasks(owner_profile_id, status, next_retry_at);
