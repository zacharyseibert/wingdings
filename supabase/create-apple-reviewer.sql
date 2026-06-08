-- Create Apple Reviewer test account
-- Auth user already created with ID: b4d806f7-d416-4e1d-80f7-83af860a9d56
-- Email: applereview@wingdings.app
-- Password: AppleTest2026!

-- Create the user profile
INSERT INTO users (id, username, display_name, email, auth_id, total_wings, avatar_url)
VALUES (
  'mob_applereview',
  'applereview',
  'Apple Reviewer',
  'applereview@wingdings.app',
  'b4d806f7-d416-4e1d-80f7-83af860a9d56',
  125,
  NULL
);

-- Add some sample wing entries
INSERT INTO wing_entries (user_id, amount, created_at, photo_url, location_name, note)
VALUES
  ('mob_applereview', 12, NOW() - INTERVAL '2 days', NULL, 'Buffalo Wild Wings', 'Classic hot wings'),
  ('mob_applereview', 20, NOW() - INTERVAL '1 day', NULL, 'Wingstop', 'Lemon pepper heaven'),
  ('mob_applereview', 18, NOW() - INTERVAL '12 hours', NULL, 'Local Wing Spot', 'Garlic parmesan'),
  ('mob_applereview', 25, NOW() - INTERVAL '6 hours', NULL, NULL, 'Big session! 🔥'),
  ('mob_applereview', 50, NOW() - INTERVAL '3 hours', NULL, 'Wing Challenge', 'Beast mode activated');

-- Award some badges manually
INSERT INTO badges (user_id, badge_key, earned_at)
VALUES
  ('mob_applereview', 'first_wing', NOW() - INTERVAL '2 days'),
  ('mob_applereview', 'ten_club', NOW() - INTERVAL '1 day'),
  ('mob_applereview', 'century', NOW() - INTERVAL '6 hours'),
  ('mob_applereview', 'big_session', NOW() - INTERVAL '6 hours'),
  ('mob_applereview', 'heavyweight', NOW() - INTERVAL '3 hours')
ON CONFLICT (user_id, badge_key) DO NOTHING;
