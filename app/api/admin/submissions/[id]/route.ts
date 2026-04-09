import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
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

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, business_name, profile_slug")
    .eq("id", approval.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Related organization not found." }, { status: 404 });
  }

  const baseSlug = slugify(org.business_name || "member");
  const finalSlug = org.profile_slug || `${baseSlug}-${org.id.slice(0, 8)}`;
  const nowIso = new Date().toISOString();

  const { error: orgUpdateError } = await supabase
    .from("organizations")
    .update({
      status: "approved",
      approved_at: nowIso,
      reviewed_at: nowIso,
      profile_slug: finalSlug
    })
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
