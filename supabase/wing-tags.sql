-- Tagging other HWFFL members in a wing session
CREATE TABLE IF NOT EXISTS wing_tags (
  id                BIGSERIAL PRIMARY KEY,
  entry_id          BIGINT NOT NULL REFERENCES wing_entries(id) ON DELETE CASCADE,
  tagger_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tagged_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  response_entry_id BIGINT REFERENCES wing_entries(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_id, tagged_id)
);

CREATE INDEX IF NOT EXISTS idx_wing_tags_tagged_status ON wing_tags (tagged_id, status);
CREATE INDEX IF NOT EXISTS idx_wing_tags_response ON wing_tags (response_entry_id);

-- Only the backend (service role) reads and writes tags
ALTER TABLE wing_tags ENABLE ROW LEVEL SECURITY;
