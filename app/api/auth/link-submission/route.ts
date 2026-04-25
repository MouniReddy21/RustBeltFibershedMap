import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/link-submission
 *
 * Called automatically after sign-in or sign-up. Checks whether the
 * newly authenticated user's email matches an existing public-form submission
 * that has no auth_user_id yet, and if so links it to their account.
 *
 * This is idempotent and non-fatal — the caller should not block on errors.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user?.email) {
    return NextResponse.json({ linked: false, reason: "not_authenticated" });
  }

  const admin = createSupabaseAdminClient();

  // If the user already owns an org, nothing to do.
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingOrg) {
    return NextResponse.json({ linked: false, reason: "already_linked" });
  }

  // Find the most recent unlinked submission with this email.
  const { data: candidates } = await admin
    .from("organizations")
    .select("id")
    .eq("email", user.email.toLowerCase())
    .is("auth_user_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!candidates?.length) {
    return NextResponse.json({ linked: false, reason: "no_submission" });
  }

  // Use .is("auth_user_id", null) in the WHERE clause of the UPDATE so we
  // never clobber a record that was claimed between the SELECT and UPDATE.
  const { error } = await admin
    .from("organizations")
    .update({ auth_user_id: user.id })
    .eq("id", candidates[0].id)
    .is("auth_user_id", null);

  if (error) {
    return NextResponse.json({ linked: false, reason: "update_failed" });
  }

  return NextResponse.json({ linked: true });
}
