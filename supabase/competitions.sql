-- Competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Add competition_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS competition_id BIGINT REFERENCES competitions(id) ON DELETE SET NULL;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_competitions_code ON competitions(code);
CREATE INDEX IF NOT EXISTS idx_users_competition ON users(competition_id);

-- Create your HWFFL competition
INSERT INTO competitions (name, code, created_by)
VALUES ('HWFFL', 'HWFFL-2026', NULL)
ON CONFLICT (code) DO NOTHING;

-- Move existing users to HWFFL competition
UPDATE users
SET competition_id = (SELECT id FROM competitions WHERE code = 'HWFFL-2026')
WHERE id IN (
  SELECT id FROM users WHERE email LIKE '%@%' -- your actual users
  AND id != 'mob_applereview' -- keep reviewer in global
);
