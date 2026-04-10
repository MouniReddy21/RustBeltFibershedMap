ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_short_bio_check;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_short_bio_max_250_check;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_short_bio_max_500_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_short_bio_max_500_check
  CHECK (char_length(short_bio) <= 500);
