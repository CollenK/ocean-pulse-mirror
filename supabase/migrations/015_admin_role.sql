-- 015_admin_role.sql
-- Add admin role to profiles and set initial admin user

ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set collen.kriel@gmail.com as admin
-- Look up user by email in auth.users and update their profile
UPDATE profiles
SET is_admin = true, is_expert = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'collen.kriel@gmail.com' LIMIT 1
);

-- Admin stats view for dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM profiles WHERE is_expert) AS expert_count,
  (SELECT COUNT(*) FROM profiles WHERE is_admin) AS admin_count,
  (SELECT COUNT(*) FROM observations WHERE is_draft = false) AS total_observations,
  (SELECT COUNT(*) FROM observations WHERE is_draft = false AND created_at > now() - interval '7 days') AS observations_last_7d,
  (SELECT COUNT(*) FROM observations WHERE is_draft = false AND created_at > now() - interval '30 days') AS observations_last_30d,
  (SELECT COUNT(*) FROM observation_verifications) AS total_verifications,
  (SELECT COUNT(*) FROM observation_verifications WHERE created_at > now() - interval '7 days') AS verifications_last_7d,
  (SELECT COUNT(*) FROM mpas) AS total_mpas,
  (SELECT COUNT(*) FROM saved_mpas) AS total_saved_mpas,
  (SELECT COUNT(*) FROM notifications) AS total_notifications,
  (SELECT COUNT(*) FROM notifications WHERE read = false) AS unread_notifications,
  (SELECT COUNT(*) FROM observations WHERE quality_tier = 'casual' AND is_draft = false) AS tier_casual,
  (SELECT COUNT(*) FROM observations WHERE quality_tier = 'needs_id' AND is_draft = false) AS tier_needs_id,
  (SELECT COUNT(*) FROM observations WHERE quality_tier = 'community_verified' AND is_draft = false) AS tier_verified,
  (SELECT COUNT(*) FROM observations WHERE quality_tier = 'research_grade' AND is_draft = false) AS tier_research_grade;

-- RLS: only admins can read admin views
-- (Views don't support RLS directly, we protect via the API route instead)
