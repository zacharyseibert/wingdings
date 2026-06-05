-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)

CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- Slack user ID (e.g. "U012AB3CD")
  username    TEXT,
  display_name TEXT,
  avatar_url  TEXT,
  total_wings INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wing_entries (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,           -- positive = add, negative = remove
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX idx_users_total_wings ON users (total_wings DESC);
-- Index for history queries
CREATE INDEX idx_entries_user_created ON wing_entries (user_id, created_at DESC);

-- Keep total_wings in sync automatically
CREATE OR REPLACE FUNCTION update_user_wings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET total_wings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM wing_entries
    WHERE user_id = NEW.user_id
  ),
  updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wings
AFTER INSERT ON wing_entries
FOR EACH ROW EXECUTE FUNCTION update_user_wings();

-- Enable real-time for the leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE users;
