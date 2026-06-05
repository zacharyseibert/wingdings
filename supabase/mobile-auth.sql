-- Run this in Supabase SQL Editor to support mobile app auth

-- 1. Add auth_id column to link Supabase Auth users to wing profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id);

-- 2. RLS: allow authenticated mobile users to insert their own profile
CREATE POLICY "Users can insert own profile" ON users
FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth_id = auth.uid());

-- 3. RLS: allow authenticated users to insert their own wing entries
CREATE POLICY "Users can insert own entries" ON wing_entries
FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- 4. Enable real-time for wing_entries (activity feed)
ALTER PUBLICATION supabase_realtime ADD TABLE wing_entries;
