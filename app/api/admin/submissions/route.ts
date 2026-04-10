import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/require-admin";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("approvals")
    .select(
      "id, organization_id, status, intake_source, created_at, rejection_reason, organizations(id, business_name, full_name, city, state, email, producer_type, status, profile_slug)"
    )
    .in("status", ["submitted", "under_review"])
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Failed to load submissions." }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}
