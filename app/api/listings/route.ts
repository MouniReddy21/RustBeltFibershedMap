import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toMapMarkerPayload } from "@/lib/mapbox/map-data";
import type { DirectoryListing } from "@/lib/types";

function normalizeFibers(profile: Record<string, unknown> | null): string[] {
  if (!profile) return [];

  const fiberFlags: Array<[string, string]> = [
    ["fiber_alpaca", "alpaca"],
    ["fiber_sheep_wool", "sheep wool"],
    ["fiber_angora", "angora"],
    ["fiber_mohair", "mohair"],
    ["fiber_cashmere", "cashmere"],
    ["fiber_llama", "llama"]
  ];

  return fiberFlags
    .filter(([key]) => Boolean(profile[key]))
    .map(([, label]) => label);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const fiber = searchParams.get("fiber")?.trim().toLowerCase() ?? "";
  const producerType = searchParams.get("producer_type")?.trim() ?? "";
  const wasteWoolOnly = searchParams.get("waste_wool") === "true";
  const universityOnly = searchParams.get("university") === "true";

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, profile_slug, business_name, short_bio, city, state, producer_type, lat, lng, status, location_privacy_level, public_contact, organization_profiles(waste_wool_avail, is_university, fiber_alpaca, fiber_sheep_wool, fiber_angora, fiber_mohair, fiber_cashmere, fiber_llama)"
    )
    .eq("status", "approved")
    .order("business_name", { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Failed to load listings." }, { status: 500 });
  }

  const { data: exchangeRows } = await supabase
    .from("exchange_posts")
    .select("organization_id, post_type")
    .eq("status", "active")
    .limit(5000);

  const exchangeByOrg = new Map<string, { offering: number; wanted: number }>();

  for (const row of exchangeRows ?? []) {
    const orgId = String(row.organization_id ?? "");
    if (!orgId) continue;
    const current = exchangeByOrg.get(orgId) ?? { offering: 0, wanted: 0 };

    if (row.post_type === "offering") {
      current.offering += 1;
    } else if (row.post_type === "wanted") {
      current.wanted += 1;
    }

    exchangeByOrg.set(orgId, current);
  }

  const listings = ((data ?? []) as Array<Record<string, unknown>>)
    .map((listing): DirectoryListing => {
      const profile = Array.isArray(listing.organization_profiles)
        ? (listing.organization_profiles[0] as Record<string, unknown> | undefined) ?? null
        : (listing.organization_profiles as Record<string, unknown> | null);
      const fibers = normalizeFibers(profile);

      return {
        id: String(listing.id),
        profile_slug: String(listing.profile_slug ?? ""),
        business_name: String(listing.business_name ?? ""),
        short_bio: String(listing.short_bio ?? ""),
        city: String(listing.city ?? ""),
        state: String(listing.state ?? ""),
        producer_type: String(listing.producer_type ?? "N/A"),
        lat: typeof listing.lat === "number" ? listing.lat : null,
        lng: typeof listing.lng === "number" ? listing.lng : null,
        status: "approved",
        location_privacy_level: listing.location_privacy_level === "exact" ? "exact" : "city_only",
        public_contact: Boolean(listing.public_contact),
        waste_wool_avail: Boolean(profile?.waste_wool_avail),
        is_university: Boolean(profile?.is_university),
        fibers,
        exchange_summary: {
          offering_count: exchangeByOrg.get(String(listing.id))?.offering ?? 0,
          wanted_count: exchangeByOrg.get(String(listing.id))?.wanted ?? 0
        }
      };
    })
    .filter((listing) => {
      const qMatch =
        !q ||
        `${listing.business_name} ${listing.short_bio} ${listing.producer_type}`
          .toLowerCase()
          .includes(q.toLowerCase());
      const cityMatch = !city || listing.city.toLowerCase().includes(city.toLowerCase());
      const producerMatch = !producerType || listing.producer_type === producerType;
      const wasteWoolMatch = !wasteWoolOnly || listing.waste_wool_avail;
      const universityMatch = !universityOnly || listing.is_university;
      const fiberMatch = !fiber || listing.fibers.some((item) => item.includes(fiber));

      return qMatch && cityMatch && producerMatch && wasteWoolMatch && universityMatch && fiberMatch;
    });

  const markers = toMapMarkerPayload(listings);

  return NextResponse.json({
    filters: {
      q,
      city,
      fiber,
      producer_type: producerType,
      waste_wool: wasteWoolOnly,
      university: universityOnly
    },
    total: listings.length,
    listings,
    markers
  });
}
