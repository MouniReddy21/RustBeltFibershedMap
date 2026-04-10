import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const draftSchema = z.object({
  full_name: z.string().trim().max(120).optional(),
  business_name: z.string().trim().max(140).optional(),
  short_bio: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  zip: z.string().trim().max(20).optional(),
  producer_type: z.string().trim().max(120).optional(),
  consent: z.boolean().optional(),
  public_contact: z.boolean().optional(),
  location_privacy_level: z.enum(["exact", "city_only"]).optional()
});

function normalizeDraft(org: Record<string, unknown> | null) {
  if (!org) return null;

  const clean = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (v === "TBD") return "";
    if (v === "00000") return "";
    if (v === "Profile draft in progress.") return "";
    return v;
  };

  return {
    full_name: clean(org.full_name),
    business_name: clean(org.business_name),
    short_bio: clean(org.short_bio),
    city: clean(org.city),
    state: clean(org.state),
    zip: clean(org.zip),
    producer_type: clean(org.producer_type) === "N/A" ? "" : clean(org.producer_type),
    consent: Boolean(org.consent),
    public_contact: Boolean(org.public_contact),
    location_privacy_level: org.location_privacy_level === "exact" ? "exact" : "city_only",
    status: String(org.status ?? "pending")
  };
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "id, full_name, business_name, short_bio, city, state, zip, producer_type, consent, public_contact, location_privacy_level, status"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load draft profile." }, { status: 500 });
  }

  return NextResponse.json({ organization: normalizeDraft((data as Record<string, unknown> | null) ?? null) });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft payload." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("organizations")
    .select("id, full_name, business_name, short_bio, city, state, zip, producer_type, consent, public_contact, location_privacy_level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Failed to read current profile draft." }, { status: 500 });
  }

  const baseName =
    parsed.data.full_name?.trim() ||
    String(existing?.full_name ?? "").trim() ||
    String(user.user_metadata?.full_name ?? "").trim() ||
    "Member";

  const upsertPayload = {
    auth_user_id: user.id,
    full_name: parsed.data.full_name?.trim() || String(existing?.full_name ?? baseName).trim() || baseName,
    business_name:
      parsed.data.business_name?.trim() || String(existing?.business_name ?? baseName).trim() || baseName,
    short_bio:
      parsed.data.short_bio?.trim() || String(existing?.short_bio ?? "").trim() || "Profile draft in progress.",
    email: user.email ?? "",
    city: parsed.data.city?.trim() || String(existing?.city ?? "").trim() || "TBD",
    state: (parsed.data.state?.trim() || String(existing?.state ?? "").trim() || "OH").toUpperCase().slice(0, 2),
    zip: parsed.data.zip?.trim() || String(existing?.zip ?? "").trim() || "00000",
    producer_type:
      parsed.data.producer_type?.trim() || String(existing?.producer_type ?? "").trim() || "N/A",
    consent: parsed.data.consent ?? Boolean(existing?.consent ?? false),
    public_contact: parsed.data.public_contact ?? Boolean(existing?.public_contact ?? false),
    location_privacy_level:
      parsed.data.location_privacy_level ||
      (existing?.location_privacy_level === "exact" ? "exact" : "city_only"),
    status: "pending",
    last_updated: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from("organizations")
    .upsert(upsertPayload, { onConflict: "auth_user_id" })
    .select(
      "id, full_name, business_name, short_bio, city, state, zip, producer_type, consent, public_contact, location_privacy_level, status"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save draft profile." }, { status: 500 });
  }

  return NextResponse.json({ organization: normalizeDraft((data as Record<string, unknown>) ?? null) });
}
