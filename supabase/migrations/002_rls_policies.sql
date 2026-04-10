-- Rust Belt Fibershed - Row Level Security policies

BEGIN;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	admin_claim TEXT;
BEGIN
	admin_claim := COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false');
	RETURN lower(admin_claim) IN ('true', 't', '1', 'yes');
END;
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relay_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Organizations
DROP POLICY IF EXISTS org_public_read_approved ON organizations;
CREATE POLICY org_public_read_approved
ON organizations
FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS org_owner_read ON organizations;
CREATE POLICY org_owner_read
ON organizations
FOR SELECT
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS org_owner_update ON organizations;
CREATE POLICY org_owner_update
ON organizations
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS org_admin_all ON organizations;
CREATE POLICY org_admin_all
ON organizations
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Organization profiles
DROP POLICY IF EXISTS org_profiles_public_read_approved ON organization_profiles;
CREATE POLICY org_profiles_public_read_approved
ON organization_profiles
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = organization_profiles.organization_id
			AND o.status = 'approved'
	)
);

DROP POLICY IF EXISTS org_profiles_owner_read ON organization_profiles;
CREATE POLICY org_profiles_owner_read
ON organization_profiles
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = organization_profiles.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS org_profiles_owner_update ON organization_profiles;
CREATE POLICY org_profiles_owner_update
ON organization_profiles
FOR UPDATE
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = organization_profiles.organization_id
			AND o.auth_user_id = auth.uid()
	)
)
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = organization_profiles.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS org_profiles_owner_insert ON organization_profiles;
CREATE POLICY org_profiles_owner_insert
ON organization_profiles
FOR INSERT
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = organization_profiles.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS org_profiles_admin_all ON organization_profiles;
CREATE POLICY org_profiles_admin_all
ON organization_profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Approvals
DROP POLICY IF EXISTS approvals_owner_read ON approvals;
CREATE POLICY approvals_owner_read
ON approvals
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = approvals.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS approvals_admin_all ON approvals;
CREATE POLICY approvals_admin_all
ON approvals
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Contact relay emails
DROP POLICY IF EXISTS relay_public_insert ON contact_relay_emails;
CREATE POLICY relay_public_insert
ON contact_relay_emails
FOR INSERT
WITH CHECK (
	auth.role() = 'authenticated'
	AND (
		from_organization_id IS NULL
		OR EXISTS (
			SELECT 1
			FROM organizations o
			WHERE o.id = contact_relay_emails.from_organization_id
				AND o.auth_user_id = auth.uid()
		)
	)
	AND EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = contact_relay_emails.to_organization_id
			AND o.status = 'approved'
	)
);

DROP POLICY IF EXISTS relay_recipient_read ON contact_relay_emails;
CREATE POLICY relay_recipient_read
ON contact_relay_emails
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = contact_relay_emails.to_organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS relay_sender_read ON contact_relay_emails;
CREATE POLICY relay_sender_read
ON contact_relay_emails
FOR SELECT
USING (
	from_organization_id IS NOT NULL
	AND EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = contact_relay_emails.from_organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS relay_admin_all ON contact_relay_emails;
CREATE POLICY relay_admin_all
ON contact_relay_emails
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Exchange posts
DROP POLICY IF EXISTS exchange_public_read_active ON exchange_posts;
CREATE POLICY exchange_public_read_active
ON exchange_posts
FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS exchange_owner_read ON exchange_posts;
CREATE POLICY exchange_owner_read
ON exchange_posts
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = exchange_posts.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS exchange_owner_insert ON exchange_posts;
CREATE POLICY exchange_owner_insert
ON exchange_posts
FOR INSERT
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = exchange_posts.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS exchange_owner_update ON exchange_posts;
CREATE POLICY exchange_owner_update
ON exchange_posts
FOR UPDATE
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = exchange_posts.organization_id
			AND o.auth_user_id = auth.uid()
	)
)
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = exchange_posts.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS exchange_owner_delete ON exchange_posts;
CREATE POLICY exchange_owner_delete
ON exchange_posts
FOR DELETE
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = exchange_posts.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS exchange_admin_all ON exchange_posts;
CREATE POLICY exchange_admin_all
ON exchange_posts
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Tags
DROP POLICY IF EXISTS tags_public_read ON tags;
CREATE POLICY tags_public_read
ON tags
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = tags.organization_id
			AND o.status = 'approved'
	)
);

DROP POLICY IF EXISTS tags_owner_insert ON tags;
CREATE POLICY tags_owner_insert
ON tags
FOR INSERT
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = tags.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS tags_owner_update ON tags;
CREATE POLICY tags_owner_update
ON tags
FOR UPDATE
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = tags.organization_id
			AND o.auth_user_id = auth.uid()
	)
)
WITH CHECK (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = tags.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS tags_owner_delete ON tags;
CREATE POLICY tags_owner_delete
ON tags
FOR DELETE
USING (
	EXISTS (
		SELECT 1
		FROM organizations o
		WHERE o.id = tags.organization_id
			AND o.auth_user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS tags_admin_all ON tags;
CREATE POLICY tags_admin_all
ON tags
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Audit log: admin only
DROP POLICY IF EXISTS audit_admin_all ON audit_log;
CREATE POLICY audit_admin_all
ON audit_log
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Settings: read for authenticated users, write for admins
DROP POLICY IF EXISTS settings_read_authenticated ON settings;
CREATE POLICY settings_read_authenticated
ON settings
FOR SELECT
USING (auth.role() = 'authenticated' OR is_admin());

DROP POLICY IF EXISTS settings_admin_update ON settings;
CREATE POLICY settings_admin_update
ON settings
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS settings_admin_insert ON settings;
CREATE POLICY settings_admin_insert
ON settings
FOR INSERT
WITH CHECK (is_admin());

-- Explicit grants for PostgREST roles (RLS still enforces row access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON organizations, organization_profiles, exchange_posts, tags TO anon;
GRANT SELECT ON organizations, organization_profiles, exchange_posts, tags TO authenticated;

GRANT SELECT ON approvals, contact_relay_emails, audit_log, settings TO authenticated;
GRANT INSERT ON contact_relay_emails TO authenticated;
GRANT INSERT, UPDATE, DELETE ON organization_profiles, exchange_posts, tags TO authenticated;

GRANT ALL ON organizations, organization_profiles, approvals, contact_relay_emails, exchange_posts, tags, audit_log, settings TO service_role;

COMMIT;
