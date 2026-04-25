import { createSupabaseAdminClient } from "./admin";

/**
 * Writes org status and profile_slug into the user's app_metadata so the
 * layout can read them from the auth response without a second DB query.
 *
 * app_metadata is server-controlled and returned by auth.getUser() on every
 * request, so this is always up-to-date — no staleness risk.
 *
 * Non-fatal: a failure here should never block the calling route.
 */
export async function syncOrgMetaToAuth(
  authUserId: string,
  status: string,
  profileSlug: string | null
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      org_status: status,
      org_profile_slug: profileSlug ?? null,
    },
  });
}
