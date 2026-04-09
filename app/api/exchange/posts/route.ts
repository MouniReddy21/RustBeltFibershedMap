import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createPostSchema = z.object({
  postType: z.enum(["offering", "wanted"]),
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  fiberCategory: z.string().max(120).optional(),
  materialType: z.string().max(120).optional(),
  quantity: z.string().max(120).optional(),
  priceOrTradeTerms: z.string().max(200).optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(),
  expiresAt: z.string().datetime().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id")?.trim() ?? "";
  const postType = searchParams.get("post_type")?.trim() ?? "";
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("exchange_posts")
    .select(
      "id, organization_id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, photo_urls, posted_at, expires_at, status"
    )
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(200);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  if (postType === "offering" || postType === "wanted") {
    query = query.eq("post_type", postType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load exchange posts." }, { status: 500 });
  }

  const filtered = (data ?? []).filter((item) => {
    if (!q) return true;

    const haystack = `${item.title ?? ""} ${item.description ?? ""} ${item.material_type ?? ""} ${item.fiber_category ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });

  return NextResponse.json({
    total: filtered.length,
    posts: filtered
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exchange post payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: authResult } = await supabase.auth.getUser();
  const user = authResult.user;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "No organization found for this account." }, { status: 403 });
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("exchange_posts")
    .insert({
      organization_id: org.id,
      post_type: input.postType,
      title: input.title,
      description: input.description ?? null,
      fiber_category: input.fiberCategory ?? null,
      material_type: input.materialType ?? null,
      quantity: input.quantity ?? null,
      price_or_trade_terms: input.priceOrTradeTerms ?? null,
      photo_urls: input.photoUrls ?? [],
      expires_at: input.expiresAt ?? undefined,
      status: "active"
    })
    .select(
      "id, organization_id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, photo_urls, posted_at, expires_at, status"
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create exchange post." }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
