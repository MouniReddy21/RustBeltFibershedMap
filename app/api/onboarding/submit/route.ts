import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncOrgMetaToAuth } from "@/lib/supabase/sync-org-meta";

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

function isPlaceholder(value: string, placeholders: string[]) {
  const normalized = value.trim();
  return normalized.length === 0 || placeholders.includes(normalized);
}

export async function POST() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, full_name, business_name, short_bio, city, state, zip, producer_type, consent, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "No draft profile found. Save a draft first." }, { status: 400 });
  }

  const missing: string[] = [];

  if (isPlaceholder(String(org.full_name ?? ""), ["Member"])) missing.push("full_name");
  if (isPlaceholder(String(org.business_name ?? ""), ["Member"])) missing.push("business_name");
  if (isPlaceholder(String(org.short_bio ?? ""), ["Profile draft in progress."])) missing.push("short_bio");
  if (isPlaceholder(String(org.city ?? ""), ["TBD"])) missing.push("city");
  if (!/^[A-Z]{2}$/.test(String(org.state ?? ""))) missing.push("state");
  if (isPlaceholder(String(org.zip ?? ""), ["00000"])) missing.push("zip");
  if (isPlaceholder(String(org.producer_type ?? ""), ["N/A"])) missing.push("producer_type");
  if (!Boolean(org.consent)) missing.push("consent");

  if (missing.length > 0) {
    return NextResponse.json({ error: "Please complete required fields before submitting.", missing }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({ status: "pending", submitted_at: nowIso, updated_at: nowIso })
    .eq("id", org.id);

  if (orgUpdateError) {
    return NextResponse.json({ error: "Failed to submit organization for review." }, { status: 500 });
  }

  const { data: existingApproval } = await admin
    .from("approvals")
    .select("id, status")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingApproval) {
    const { error: approvalUpdateError } = await admin
      .from("approvals")
      .update({
        status: "submitted",
        rejection_reason: null,
        reviewed_at: null,
        intake_source: "profile_draft",
        intake_raw_response: {
          source: "onboarding_submit",
          submitted_at: nowIso
        },
        consent_accepted: true,
        consent_accepted_at: nowIso,
        updated_at: nowIso
      })
      .eq("id", existingApproval.id);

    if (approvalUpdateError) {
      return NextResponse.json({ error: "Failed to submit approval request." }, { status: 500 });
    }
  } else {
    const { error: approvalInsertError } = await admin.from("approvals").insert({
      organization_id: org.id,
      status: "submitted",
      intake_source: "profile_draft",
      intake_source_id: null,
      intake_raw_response: {
        source: "onboarding_submit",
        submitted_at: nowIso
      },
      consent_accepted: true,
      consent_accepted_at: nowIso
    });

    if (approvalInsertError) {
      return NextResponse.json({ error: "Failed to create approval request." }, { status: 500 });
    }
  }

  // Sync auth metadata so the layout reflects the new status without a DB query.
  if (user.id) {
    await syncOrgMetaToAuth(user.id, "pending", null).catch(() => null);
  }

  return NextResponse.json({ submitted: true, status: "pending" });
}
