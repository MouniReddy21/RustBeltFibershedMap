import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/require-admin";
import { geocodeCity } from "@/lib/mapbox/geocode";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "geocode"]),
  rejectionReason: z.string().max(500).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 56);
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: approval, error: approvalLookupError } = await supabase
    .from("approvals")
    .select("id, organization_id, status")
    .eq("id", id)
    .maybeSingle();

  if (approvalLookupError || !approval) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  if (parsed.data.action === "reject") {
    const rejection = parsed.data.rejectionReason?.trim();

    if (!rejection) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const { error: rejectError } = await supabase
      .from("approvals")
      .update({
        status: "rejected",
        rejection_reason: rejection,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id);

    if (rejectError) {
      return NextResponse.json({ error: "Failed to reject submission." }, { status: 500 });
    }

    await supabase
      .from("organizations")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString()
      })
      .eq("id", approval.organization_id);

    return NextResponse.json({ reviewed: true, status: "rejected" });
  }

  // ── Geocode action ──────────────────────────────────────────────────────
  if (parsed.data.action === "geocode") {
    const { data: geoOrg } = await supabase
      .from("organizations")
      .select("id, city, state, lat, lng")
      .eq("id", approval.organization_id)
      .maybeSingle();

    if (!geoOrg) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const coords = await geocodeCity(geoOrg.city, geoOrg.state);
    if (!coords) {
      return NextResponse.json({ error: `Could not geocode "${geoOrg.city}, ${geoOrg.state}". Check city name and try again.` }, { status: 422 });
    }

    const { error: geoUpdateError } = await supabase
      .from("organizations")
      .update({ lat: coords.lat, lng: coords.lng })
      .eq("id", geoOrg.id);

    if (geoUpdateError) {
      return NextResponse.json({ error: "Failed to save coordinates." }, { status: 500 });
    }

    return NextResponse.json({ geocoded: true, lat: coords.lat, lng: coords.lng });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, business_name, profile_slug, city, state, lat, lng, location_privacy_level")
    .eq("id", approval.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Related organization not found." }, { status: 404 });
  }

  const baseSlug = slugify(org.business_name || "member");
  const finalSlug = org.profile_slug || `${baseSlug}-${org.id.slice(0, 8)}`;
  const nowIso = new Date().toISOString();

  // Geocode city+state if we don't have coordinates yet.
  // For city_only privacy, city centroid is the right coordinates to store.
  // For exact privacy, the admin can manually update lat/lng later if needed.
  let geocodedCoords: { lat: number; lng: number } | null = null;
  if (org.lat == null || org.lng == null) {
    geocodedCoords = await geocodeCity(org.city, org.state);
  }

  const orgUpdate: Record<string, unknown> = {
    status: "approved",
    approved_at: nowIso,
    reviewed_at: nowIso,
    profile_slug: finalSlug
  };

  if (geocodedCoords) {
    orgUpdate.lat = geocodedCoords.lat;
    orgUpdate.lng = geocodedCoords.lng;
  }

  const { error: orgUpdateError } = await supabase
    .from("organizations")
    .update(orgUpdate)
    .eq("id", approval.organization_id);

  if (orgUpdateError) {
    return NextResponse.json({ error: "Failed to approve organization." }, { status: 500 });
  }

  const { error: approvalUpdateError } = await supabase
    .from("approvals")
    .update({
      status: "approved",
      rejection_reason: null,
      reviewed_at: nowIso
    })
    .eq("id", id);

  if (approvalUpdateError) {
    return NextResponse.json({ error: "Failed to approve submission." }, { status: 500 });
  }

  return NextResponse.json({ reviewed: true, status: "approved", profile_slug: finalSlug });
}
