-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key   TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_user_earned ON badges (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_lookup ON badges (user_id, badge_key);

-- Index on wing_entries for badge calculations
CREATE INDEX IF NOT EXISTS idx_wing_entries_user_date ON wing_entries (user_id, created_at DESC) WHERE amount > 0;
CREATE INDEX IF NOT EXISTS idx_wing_entries_location ON wing_entries (user_id, location_name) WHERE location_name IS NOT NULL;

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Public can read badges" ON badges;

-- Recreate policy
CREATE POLICY "Public can read badges" ON badges FOR SELECT USING (true);
