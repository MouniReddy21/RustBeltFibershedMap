import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "id, business_name, short_bio, city, county, state, lat, lng, producer_type, public_contact, website, instagram, phone, status, location_privacy_level"
    )
    .eq("profile_slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }

  if (!org) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();

  const { data: exchangePosts } = await supabase
    .from("exchange_posts")
    .select(
      "id, organization_id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, photo_urls, posted_at, expires_at, status"
    )
    .eq("organization_id", org.id)
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(20);

  const offeringCount = (exchangePosts ?? []).filter((post) => post.post_type === "offering").length;
  const wantedCount = (exchangePosts ?? []).filter((post) => post.post_type === "wanted").length;

  const safeContact = org.public_contact
    ? {
        website: org.website,
        instagram: org.instagram,
        phone: org.phone,
        mode: "public"
      }
    : {
        mode: "relay_only"
      };

  return NextResponse.json({
    organization: {
      ...org,
      contact: safeContact,
      lat: org.location_privacy_level === "city_only" ? null : org.lat,
      lng: org.location_privacy_level === "city_only" ? null : org.lng
    },
    profile,
    exchange_posts: exchangePosts ?? [],
    exchange_summary: {
      offering_count: offeringCount,
      wanted_count: wantedCount
    }
  });
}
