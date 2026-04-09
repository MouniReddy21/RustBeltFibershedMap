import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updatePostSchema = z.object({
  title: z.string().min(3).max(140).optional(),
  description: z.string().max(2000).nullable().optional(),
  fiberCategory: z.string().max(120).nullable().optional(),
  materialType: z.string().max(120).nullable().optional(),
  quantity: z.string().max(120).nullable().optional(),
  priceOrTradeTerms: z.string().max(200).nullable().optional(),
  status: z.enum(["active", "expired", "renewed", "closed"]).optional(),
  expiresAt: z.string().datetime().optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnerOrganizationId() {
  const supabase = await createSupabaseServerClient();
  const { data: authResult } = await supabase.auth.getUser();
  const user = authResult.user;

  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !org) {
    return { error: NextResponse.json({ error: "No organization found for this account." }, { status: 403 }) };
  }

  return { supabase, organizationId: org.id };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updatePostSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exchange update payload." }, { status: 400 });
  }

  const owner = await getOwnerOrganizationId();

  if (owner.error) {
    return owner.error;
  }

  const input = parsed.data;
  const updateFields: Record<string, unknown> = {};

  if (typeof input.title === "string") updateFields.title = input.title;
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.fiberCategory !== undefined) updateFields.fiber_category = input.fiberCategory;
  if (input.materialType !== undefined) updateFields.material_type = input.materialType;
  if (input.quantity !== undefined) updateFields.quantity = input.quantity;
  if (input.priceOrTradeTerms !== undefined) updateFields.price_or_trade_terms = input.priceOrTradeTerms;
  if (input.status) updateFields.status = input.status;
  if (input.expiresAt) updateFields.expires_at = input.expiresAt;

  const { data, error } = await owner.supabase
    .from("exchange_posts")
    .update(updateFields)
    .eq("id", id)
    .eq("organization_id", owner.organizationId)
    .select(
      "id, organization_id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, photo_urls, posted_at, expires_at, status"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to update exchange post." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Exchange post not found." }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const owner = await getOwnerOrganizationId();

  if (owner.error) {
    return owner.error;
  }

  const { error } = await owner.supabase
    .from("exchange_posts")
    .delete()
    .eq("id", id)
    .eq("organization_id", owner.organizationId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete exchange post." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
