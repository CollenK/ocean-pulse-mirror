-- ============================================================
-- Migration 017: Fix gamification trigger
-- Add exception handling so gamification errors do not block
-- observation creation, and add missing notifications INSERT policy
-- ============================================================

-- Add INSERT policy for notifications (was missing; only SELECT/UPDATE existed)
-- Needed by any function that creates notifications (verification, gamification)
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Rebuild trigger function with exception handler
CREATE OR REPLACE FUNCTION trigger_gamification_on_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_draft = false AND NEW.user_id IS NOT NULL THEN
    BEGIN
      PERFORM update_observation_streak(NEW.user_id);
      PERFORM check_and_award_badges(NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Gamification trigger error for user %: % %', NEW.user_id, SQLERRM, SQLSTATE;
    END;
  END IF;
  RETURN NEW;
END;
$$;
