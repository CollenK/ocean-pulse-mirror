-- Change FK action on user_health_assessments.observation_id to CASCADE
-- This ensures deleting an observation atomically deletes its health assessments

ALTER TABLE user_health_assessments
  DROP CONSTRAINT IF EXISTS user_health_assessments_observation_id_fkey;

ALTER TABLE user_health_assessments
  ADD CONSTRAINT user_health_assessments_observation_id_fkey
  FOREIGN KEY (observation_id) REFERENCES observations(id)
  ON DELETE CASCADE;
