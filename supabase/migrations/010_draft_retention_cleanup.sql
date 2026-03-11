-- Clean up old draft observations (> 90 days)
-- This can be called via Supabase pg_cron or a Vercel cron job

CREATE OR REPLACE FUNCTION cleanup_old_drafts(p_days_old INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM observations
  WHERE is_draft = true
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to service_role only (not user-callable)
GRANT EXECUTE ON FUNCTION cleanup_old_drafts TO service_role;
