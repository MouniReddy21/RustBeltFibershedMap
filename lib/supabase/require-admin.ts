import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";

/**
 * Use in Server Components / Server Actions.
 * Checks that the signed-in user has `is_admin: true` in Supabase app_metadata.
 * Redirects to "/" if the user is not authenticated or is not an admin.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.is_admin !== true) {
    redirect("/");
  }

  return user;
}

/**
 * Use in API Route Handlers.
 * Returns the user if they are an admin, or null if not.
 * The caller is responsible for returning a 401/403 response when null is returned.
 */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.is_admin !== true) {
    return null;
  }

  return user;
}
