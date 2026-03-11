-- Re-add foreign key constraints dropped in migration 003
-- observations.mpa_id and user_health_assessments.mpa_id should reference mpas.external_id

-- First ensure mpas.external_id has a UNIQUE constraint
-- (external_id is the TEXT column that stores MPA IDs like '2571')
ALTER TABLE mpas ADD CONSTRAINT mpas_external_id_unique UNIQUE (external_id);

-- Re-add FK constraint on observations.mpa_id -> mpas.external_id
ALTER TABLE observations
  ADD CONSTRAINT observations_mpa_id_fkey
  FOREIGN KEY (mpa_id) REFERENCES mpas(external_id)
  ON DELETE CASCADE;

-- Re-add FK constraint on user_health_assessments.mpa_id -> mpas.external_id
ALTER TABLE user_health_assessments
  ADD CONSTRAINT user_health_assessments_mpa_id_fkey
  FOREIGN KEY (mpa_id) REFERENCES mpas(external_id)
  ON DELETE CASCADE;
