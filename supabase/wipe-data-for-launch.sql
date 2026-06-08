-- Wipe all data before App Store launch
-- Run this in Supabase SQL Editor when ready to go live

-- IMPORTANT: This keeps the Apple Reviewer account (needed for future app reviews)
-- Everything else gets deleted

-- Delete all badges
DELETE FROM badges
WHERE user_id NOT IN ('mob_applereview');

-- Delete all wing entries
DELETE FROM wing_entries
WHERE user_id NOT IN ('mob_applereview');

-- Delete all users except Apple Reviewer
DELETE FROM users
WHERE id NOT IN ('mob_applereview');

-- Note: Auth users in Supabase Auth will remain (they're separate)
-- If you want to delete those too, go to Supabase Dashboard > Authentication > Users
-- and manually delete test users (keep applereview@wingdings.app)

-- Verify counts after running
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'wing_entries', COUNT(*) FROM wing_entries
UNION ALL
SELECT 'badges', COUNT(*) FROM badges;
