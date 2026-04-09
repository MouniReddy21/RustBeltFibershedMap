import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function mapTallyToOrganization(payload: Record<string, unknown>) {
  const fullName = String(payload.full_name ?? "").trim();
  const businessName = String(payload.business_name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();

  return {
    full_name: fullName,
    business_name: businessName || fullName,
    email,
    short_bio: String(payload.short_bio ?? "").slice(0, 150),
    city: String(payload.city ?? "").trim(),
    state: String(payload.state ?? "OH").trim().toUpperCase(),
    zip: String(payload.zip ?? "").trim(),
    producer_type: String(payload.producer_type ?? "N/A"),
    consent: Boolean(payload.consent),
    public_contact: Boolean(payload.public_contact),
    status: "pending" as const,
    location_privacy_level: payload.location_privacy_level === "exact" ? "exact" : "city_only"
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orgInput = mapTallyToOrganization(body);

  if (!orgInput.full_name || !orgInput.email || !orgInput.city || !orgInput.zip || !orgInput.consent) {
    return NextResponse.json({ error: "Missing required fields or consent not accepted." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert(orgInput)
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Failed to create pending organization." }, { status: 500 });
  }

  const intakeSourceId = String(body.response_id ?? body.submission_id ?? "").trim() || null;

  const { error: approvalError } = await supabase.from("approvals").insert({
    organization_id: org.id,
    status: "submitted",
    intake_source: "tally",
    intake_source_id: intakeSourceId,
    intake_raw_response: body,
    consent_accepted: true,
    consent_accepted_at: new Date().toISOString()
  });

  if (approvalError) {
    return NextResponse.json({ error: "Failed to record intake approval entry." }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, organizationId: org.id }, { status: 202 });
}
