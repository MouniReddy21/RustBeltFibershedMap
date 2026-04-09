-- Rust Belt Fibershed - Initial schema
-- Includes 6 critical additions:
-- 1) contact relay tracking table
-- 2) exchange posts schema
-- 3) rejection_reason on approvals
-- 4) intake_source/intake_source_id/intake_raw_response audit fields
-- 5) location_privacy_level toggle
-- 6) confirmation_at + donation fields

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status_enum') THEN
		CREATE TYPE listing_status_enum AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'archived');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
		CREATE TYPE approval_status_enum AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_privacy_enum') THEN
		CREATE TYPE location_privacy_enum AS ENUM ('exact', 'city_only');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exchange_post_type_enum') THEN
		CREATE TYPE exchange_post_type_enum AS ENUM ('offering', 'wanted');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exchange_post_status_enum') THEN
		CREATE TYPE exchange_post_status_enum AS ENUM ('active', 'expired', 'renewed', 'closed');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_relay_status_enum') THEN
		CREATE TYPE contact_relay_status_enum AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'failed');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status_enum') THEN
		CREATE TYPE donation_status_enum AS ENUM ('skipped', 'completed');
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_user_id UUID UNIQUE,

	status listing_status_enum NOT NULL DEFAULT 'pending',
	submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	approved_at TIMESTAMPTZ,

	full_name TEXT NOT NULL,
	business_name TEXT NOT NULL,
	short_bio TEXT NOT NULL CHECK (char_length(short_bio) <= 150),

	email TEXT NOT NULL CHECK (position('@' in email) > 1),
	phone TEXT,
	website TEXT,
	instagram TEXT,
	profile_photo_url TEXT,

	public_contact BOOLEAN NOT NULL DEFAULT false,
	consent BOOLEAN NOT NULL,

	city TEXT NOT NULL,
	state TEXT NOT NULL CHECK (char_length(state) = 2),
	zip TEXT NOT NULL,
	county TEXT,
	lat DOUBLE PRECISION,
	lng DOUBLE PRECISION,
	in_bioregion BOOLEAN,

	-- Critical addition #5
	location_privacy_level location_privacy_enum NOT NULL DEFAULT 'city_only',

	producer_type TEXT NOT NULL,

	reviewed_by TEXT,
	reviewed_at TIMESTAMPTZ,
	map_dot_color TEXT,
	profile_slug TEXT UNIQUE,
	last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
	notes_admin TEXT,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_profiles (
	organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

	-- Producer type flags
	is_farmer BOOLEAN NOT NULL DEFAULT false,
	is_mill BOOLEAN NOT NULL DEFAULT false,
	is_manufacturer BOOLEAN NOT NULL DEFAULT false,
	is_designer BOOLEAN NOT NULL DEFAULT false,

	-- Animal fibers
	fiber_alpaca BOOLEAN NOT NULL DEFAULT false,
	fiber_sheep_wool BOOLEAN NOT NULL DEFAULT false,
	fiber_angora BOOLEAN NOT NULL DEFAULT false,
	fiber_mohair BOOLEAN NOT NULL DEFAULT false,
	fiber_cashmere BOOLEAN NOT NULL DEFAULT false,
	fiber_llama BOOLEAN NOT NULL DEFAULT false,
	fiber_animal_other TEXT,
	waste_wool_avail BOOLEAN NOT NULL DEFAULT false,

	-- Fiber crops
	crop_cotton BOOLEAN NOT NULL DEFAULT false,
	crop_flax_linen BOOLEAN NOT NULL DEFAULT false,
	crop_hemp BOOLEAN NOT NULL DEFAULT false,
	crop_nettle BOOLEAN NOT NULL DEFAULT false,
	crop_other TEXT,

	-- Processing
	proc_dyeing BOOLEAN NOT NULL DEFAULT false,
	proc_printing BOOLEAN NOT NULL DEFAULT false,
	proc_spinning BOOLEAN NOT NULL DEFAULT false,
	proc_weaving BOOLEAN NOT NULL DEFAULT false,
	proc_felting BOOLEAN NOT NULL DEFAULT false,
	proc_carding BOOLEAN NOT NULL DEFAULT false,
	proc_shearing BOOLEAN NOT NULL DEFAULT false,
	proc_tailoring BOOLEAN NOT NULL DEFAULT false,
	proc_mending BOOLEAN NOT NULL DEFAULT false,
	proc_cut_sew BOOLEAN NOT NULL DEFAULT false,

	-- Dye and color
	dye_garden BOOLEAN NOT NULL DEFAULT false,
	dye_indigo BOOLEAN NOT NULL DEFAULT false,
	dye_woad BOOLEAN NOT NULL DEFAULT false,
	dye_natural_other TEXT,
	dye_algae_ink BOOLEAN NOT NULL DEFAULT false,
	dye_synthetic BOOLEAN NOT NULL DEFAULT false,

	-- Recycling and diversion
	recycle_fiber BOOLEAN NOT NULL DEFAULT false,
	recycle_fabric BOOLEAN NOT NULL DEFAULT false,
	recycle_metal BOOLEAN NOT NULL DEFAULT false,
	recycle_accepts_waste BOOLEAN NOT NULL DEFAULT false,
	recycle_shredding BOOLEAN NOT NULL DEFAULT false,

	-- Reuse and resale
	reuse_upcycling BOOLEAN NOT NULL DEFAULT false,
	reuse_vintage BOOLEAN NOT NULL DEFAULT false,

	-- Community resources
	comm_student_ambassador BOOLEAN NOT NULL DEFAULT false,
	comm_volunteer BOOLEAN NOT NULL DEFAULT false,
	comm_hiring BOOLEAN NOT NULL DEFAULT false,
	comm_workshops BOOLEAN NOT NULL DEFAULT false,
	comm_csa BOOLEAN NOT NULL DEFAULT false,
	comm_tours BOOLEAN NOT NULL DEFAULT false,

	-- Exchange/profile fields
	looking_for TEXT,
	have_available TEXT,
	qty_available TEXT,
	price_range TEXT,

	-- University and research
	is_university BOOLEAN NOT NULL DEFAULT false,
	research_areas TEXT,
	open_to_collab BOOLEAN NOT NULL DEFAULT false,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

	status approval_status_enum NOT NULL DEFAULT 'submitted',

	-- Critical addition #4
	intake_source TEXT NOT NULL DEFAULT 'tally',
	intake_source_id TEXT,
	intake_raw_response JSONB,

	consent_accepted BOOLEAN NOT NULL,
	consent_accepted_at TIMESTAMPTZ,

	reviewed_by UUID,
	reviewed_at TIMESTAMPTZ,

	-- Critical addition #3
	rejection_reason TEXT,

	-- Critical addition #6
	confirmation_at TIMESTAMPTZ,
	donation_status donation_status_enum NOT NULL DEFAULT 'skipped',
	donation_amount NUMERIC(10, 2),

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical addition #1
CREATE TABLE IF NOT EXISTS contact_relay_emails (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	to_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	from_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

	from_name TEXT NOT NULL,
	from_email TEXT NOT NULL CHECK (position('@' in from_email) > 1),
	subject TEXT,
	message_body TEXT NOT NULL,

	status contact_relay_status_enum NOT NULL DEFAULT 'queued',
	provider_message_id TEXT,
	sent_at TIMESTAMPTZ,
	delivered_at TIMESTAMPTZ,
	bounced_at TIMESTAMPTZ,
	failed_at TIMESTAMPTZ,
	failure_reason TEXT,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical addition #2
CREATE TABLE IF NOT EXISTS exchange_posts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

	post_type exchange_post_type_enum NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	fiber_category TEXT,
	material_type TEXT,
	quantity TEXT,
	price_or_trade_terms TEXT,
	photo_urls TEXT[] NOT NULL DEFAULT '{}',

	posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
	renewal_reminded_at TIMESTAMPTZ,
	status exchange_post_status_enum NOT NULL DEFAULT 'active',

	view_count INTEGER NOT NULL DEFAULT 0,
	inquiry_count INTEGER NOT NULL DEFAULT 0,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	key TEXT NOT NULL,
	value TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (organization_id, key, value)
);

CREATE TABLE IF NOT EXISTS audit_log (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	actor_user_id UUID,
	organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
	action TEXT NOT NULL,
	resource_type TEXT NOT NULL,
	resource_id UUID,
	payload JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value JSONB NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings(key, value)
VALUES
	('bioregion_center', '{"lat":41.4993,"lng":-81.6944,"radius_miles":250}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_org_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_org_city_state ON organizations(city, state);
CREATE INDEX IF NOT EXISTS idx_org_profile_slug ON organizations(profile_slug);
CREATE INDEX IF NOT EXISTS idx_org_in_bioregion ON organizations(in_bioregion);
CREATE INDEX IF NOT EXISTS idx_org_updated_at ON organizations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_email ON organizations(lower(email));
CREATE INDEX IF NOT EXISTS idx_org_lat_lng ON organizations(lat, lng);

CREATE INDEX IF NOT EXISTS idx_profiles_waste_wool ON organization_profiles(waste_wool_avail);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON organization_profiles(is_university);

CREATE INDEX IF NOT EXISTS idx_approvals_org_id ON approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_intake_source_id ON approvals(intake_source_id);

CREATE INDEX IF NOT EXISTS idx_relay_to_org ON contact_relay_emails(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_relay_status ON contact_relay_emails(status);
CREATE INDEX IF NOT EXISTS idx_relay_created_at ON contact_relay_emails(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_org_id ON exchange_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_exchange_status ON exchange_posts(status);
CREATE INDEX IF NOT EXISTS idx_exchange_expires_at ON exchange_posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_exchange_post_type ON exchange_posts(post_type);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_set_updated_at ON organizations;
CREATE TRIGGER trg_org_set_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_org_profiles_set_updated_at ON organization_profiles;
CREATE TRIGGER trg_org_profiles_set_updated_at
BEFORE UPDATE ON organization_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_approvals_set_updated_at ON approvals;
CREATE TRIGGER trg_approvals_set_updated_at
BEFORE UPDATE ON approvals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_relay_set_updated_at ON contact_relay_emails;
CREATE TRIGGER trg_relay_set_updated_at
BEFORE UPDATE ON contact_relay_emails
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exchange_set_updated_at ON exchange_posts;
CREATE TRIGGER trg_exchange_set_updated_at
BEFORE UPDATE ON exchange_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_in_bioregion()
RETURNS TRIGGER AS $$
DECLARE
	center_lat DOUBLE PRECISION := 41.4993;
	center_lng DOUBLE PRECISION := -81.6944;
	radius_miles DOUBLE PRECISION := 250.0;
	distance_miles DOUBLE PRECISION;
BEGIN
	IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
		NEW.in_bioregion := NULL;
		RETURN NEW;
	END IF;

	distance_miles := earth_distance(
		ll_to_earth(center_lat, center_lng),
		ll_to_earth(NEW.lat, NEW.lng)
	) / 1609.344;

	NEW.in_bioregion := distance_miles <= radius_miles;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_set_in_bioregion ON organizations;
CREATE TRIGGER trg_org_set_in_bioregion
BEFORE INSERT OR UPDATE OF lat, lng ON organizations
FOR EACH ROW EXECUTE FUNCTION set_in_bioregion();

COMMIT;
