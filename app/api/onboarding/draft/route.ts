import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const draftSchema = z.object({
  // Basic
  full_name: z.string().trim().max(120).optional(),
  business_name: z.string().trim().max(140).optional(),
  short_bio: z.string().trim().max(500).optional(),
  producer_type: z.string().trim().max(300).optional(),
  // Contact
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().max(200).optional(),
  instagram: z.string().trim().max(100).optional(),
  // Location
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  zip: z.string().trim().max(20).optional(),
  location_privacy_level: z.enum(["exact", "city_only"]).optional(),
  // Privacy & consent
  consent: z.boolean().optional(),
  public_contact: z.boolean().optional(),
  // Profile arrays
  animal_fibers: z.array(z.string()).optional(),
  fiber_animal_other: z.string().trim().max(200).optional(),
  fiber_crops: z.array(z.string()).optional(),
  crop_other: z.string().trim().max(200).optional(),
  processing_services: z.array(z.string()).optional(),
  dye_methods: z.array(z.string()).optional(),
  dye_natural_other: z.string().trim().max(200).optional(),
  recycling_services: z.array(z.string()).optional(),
  reuse_services: z.array(z.string()).optional(),
  community_offerings: z.array(z.string()).optional(),
  // Profile text fields
  looking_for: z.string().trim().max(500).optional(),
  have_available: z.string().trim().max(500).optional(),
  qty_available: z.string().trim().max(120).optional(),
  price_range: z.string().trim().max(120).optional(),
  research_areas: z.string().trim().max(300).optional(),
  // Profile booleans
  waste_wool_avail: z.boolean().optional(),
  is_university: z.boolean().optional(),
  open_to_collab: z.boolean().optional(),
});

function normalizeDraft(
  org: Record<string, unknown> | null,
  profile: Record<string, unknown> | null = null
) {
  if (!org) return null;

  const clean = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (v === "TBD") return "";
    if (v === "00000") return "";
    if (v === "Profile draft in progress.") return "";
    return v;
  };

  // Convert organization_profiles boolean columns back to string arrays
  const animal_fibers: string[] = [];
  const fiber_crops: string[] = [];
  const processing_services: string[] = [];
  const dye_methods: string[] = [];
  const recycling_services: string[] = [];
  const reuse_services: string[] = [];
  const community_offerings: string[] = [];

  if (profile) {
    if (profile.fiber_alpaca) animal_fibers.push("alpaca");
    if (profile.fiber_sheep_wool) animal_fibers.push("sheep_wool");
    if (profile.fiber_angora) animal_fibers.push("angora");
    if (profile.fiber_mohair) animal_fibers.push("mohair");
    if (profile.fiber_cashmere) animal_fibers.push("cashmere");
    if (profile.fiber_llama) animal_fibers.push("llama");

    if (profile.crop_cotton) fiber_crops.push("cotton");
    if (profile.crop_flax_linen) fiber_crops.push("flax_linen");
    if (profile.crop_hemp) fiber_crops.push("hemp");
    if (profile.crop_nettle) fiber_crops.push("nettle");

    if (profile.proc_dyeing) processing_services.push("dyeing");
    if (profile.proc_spinning) processing_services.push("spinning");
    if (profile.proc_weaving) processing_services.push("weaving");
    if (profile.proc_felting) processing_services.push("felting");
    if (profile.proc_carding) processing_services.push("carding");
    if (profile.proc_shearing) processing_services.push("shearing");
    if (profile.proc_tailoring) processing_services.push("tailoring");
    if (profile.proc_mending) processing_services.push("mending");
    if (profile.proc_printing) processing_services.push("printing");
    if (profile.proc_cut_sew) processing_services.push("cut_sew");

    if (profile.dye_garden) dye_methods.push("garden");
    if (profile.dye_indigo) dye_methods.push("indigo");
    if (profile.dye_woad) dye_methods.push("woad");
    if (profile.dye_algae_ink) dye_methods.push("algae_ink");
    if (profile.dye_synthetic) dye_methods.push("synthetic");

    if (profile.recycle_fiber) recycling_services.push("fiber");
    if (profile.recycle_fabric) recycling_services.push("fabric");
    if (profile.recycle_metal) recycling_services.push("metal");
    if (profile.recycle_accepts_waste) recycling_services.push("accepts_waste");
    if (profile.recycle_shredding) recycling_services.push("shredding");

    if (profile.reuse_upcycling) reuse_services.push("upcycling");
    if (profile.reuse_vintage) reuse_services.push("vintage");

    if (profile.comm_workshops) community_offerings.push("workshops");
    if (profile.comm_csa) community_offerings.push("csa");
    if (profile.comm_tours) community_offerings.push("tours");
    if (profile.comm_hiring) community_offerings.push("hiring");
    if (profile.comm_volunteer) community_offerings.push("volunteer");
    if (profile.comm_student_ambassador) community_offerings.push("student_ambassador");
  }

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
    status: String(org.status ?? "pending"),
    profile_slug: String(org.profile_slug ?? ""),
    // Contact
    phone: clean(org.phone),
    website: clean(org.website),
    instagram: clean(org.instagram),
    // Profile arrays
    animal_fibers,
    fiber_animal_other: String(profile?.fiber_animal_other ?? ""),
    fiber_crops,
    crop_other: String(profile?.crop_other ?? ""),
    processing_services,
    dye_methods,
    dye_natural_other: String(profile?.dye_natural_other ?? ""),
    recycling_services,
    reuse_services,
    community_offerings,
    // Profile text
    looking_for: String(profile?.looking_for ?? ""),
    have_available: String(profile?.have_available ?? ""),
    qty_available: String(profile?.qty_available ?? ""),
    price_range: String(profile?.price_range ?? ""),
    research_areas: String(profile?.research_areas ?? ""),
    // Profile booleans
    waste_wool_avail: Boolean(profile?.waste_wool_avail),
    is_university: Boolean(profile?.is_university),
    open_to_collab: Boolean(profile?.open_to_collab),
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
      "id, full_name, business_name, short_bio, city, state, zip, phone, website, instagram, producer_type, consent, public_contact, location_privacy_level, status, profile_slug"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load draft profile." }, { status: 500 });
  }

  let profile: Record<string, unknown> | null = null;
  let rejection_reason: string | null = null;

  if (data?.id) {
    const [profileResult, approvalResult] = await Promise.all([
      admin
        .from("organization_profiles")
        .select("*")
        .eq("organization_id", data.id)
        .maybeSingle(),
      // Only fetch rejection reason when it's actually needed.
      data.status === "rejected"
        ? admin
            .from("approvals")
            .select("rejection_reason")
            .eq("organization_id", data.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    profile = (profileResult.data as Record<string, unknown> | null) ?? null;
    rejection_reason = (approvalResult.data as { rejection_reason?: string | null } | null)?.rejection_reason ?? null;
  }

  return NextResponse.json({
    organization: normalizeDraft((data as Record<string, unknown> | null) ?? null, profile),
    rejection_reason,
  });
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
    .select("id, full_name, business_name, short_bio, city, state, zip, phone, website, instagram, producer_type, consent, public_contact, location_privacy_level")
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
    phone: parsed.data.phone?.trim() ?? String(existing?.phone ?? "") ?? null,
    website: parsed.data.website?.trim() ?? String(existing?.website ?? "") ?? null,
    instagram: parsed.data.instagram?.trim() ?? String(existing?.instagram ?? "") ?? null,
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
    // Preserve the existing status — never downgrade an approved/rejected org back to pending on a draft save.
    // Status changes only happen through explicit actions: submit → pending, admin approve → approved, etc.
    status: String(existing?.status ?? "pending"),
    last_updated: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from("organizations")
    .upsert(upsertPayload, { onConflict: "auth_user_id" })
    .select(
      "id, full_name, business_name, short_bio, city, state, zip, phone, website, instagram, producer_type, consent, public_contact, location_privacy_level, status"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save draft profile." }, { status: 500 });
  }

  // Upsert organization_profiles when any profile field is present in request
  const hasProfileFields = [
    parsed.data.animal_fibers, parsed.data.fiber_crops, parsed.data.processing_services,
    parsed.data.dye_methods, parsed.data.recycling_services, parsed.data.reuse_services,
    parsed.data.community_offerings, parsed.data.looking_for, parsed.data.have_available,
    parsed.data.waste_wool_avail, parsed.data.is_university, parsed.data.open_to_collab,
  ].some(v => v !== undefined);

  let updatedProfile: Record<string, unknown> | null = null;

  if (hasProfileFields) {
    const af = parsed.data.animal_fibers ?? [];
    const fc = parsed.data.fiber_crops ?? [];
    const ps = parsed.data.processing_services ?? [];
    const dm = parsed.data.dye_methods ?? [];
    const rs = parsed.data.recycling_services ?? [];
    const rv = parsed.data.reuse_services ?? [];
    const co = parsed.data.community_offerings ?? [];
    const pt = upsertPayload.producer_type;

    const profilePayload = {
      organization_id: data.id,
      is_farmer: pt.includes("Farmer / fiber grower"),
      is_mill: pt.includes("Fiber processing & mills"),
      is_manufacturer: pt.includes("Designer / maker"),
      is_designer: pt.includes("Designer / maker"),
      fiber_alpaca: af.includes("alpaca"),
      fiber_sheep_wool: af.includes("sheep_wool"),
      fiber_angora: af.includes("angora"),
      fiber_mohair: af.includes("mohair"),
      fiber_cashmere: af.includes("cashmere"),
      fiber_llama: af.includes("llama"),
      fiber_animal_other: parsed.data.fiber_animal_other?.trim() || null,
      waste_wool_avail: parsed.data.waste_wool_avail ?? false,
      crop_cotton: fc.includes("cotton"),
      crop_flax_linen: fc.includes("flax_linen"),
      crop_hemp: fc.includes("hemp"),
      crop_nettle: fc.includes("nettle"),
      crop_other: parsed.data.crop_other?.trim() || null,
      proc_dyeing: ps.includes("dyeing"),
      proc_spinning: ps.includes("spinning"),
      proc_weaving: ps.includes("weaving"),
      proc_felting: ps.includes("felting"),
      proc_carding: ps.includes("carding"),
      proc_shearing: ps.includes("shearing"),
      proc_tailoring: ps.includes("tailoring"),
      proc_mending: ps.includes("mending"),
      proc_printing: ps.includes("printing"),
      proc_cut_sew: ps.includes("cut_sew"),
      dye_garden: dm.includes("garden"),
      dye_indigo: dm.includes("indigo"),
      dye_woad: dm.includes("woad"),
      dye_algae_ink: dm.includes("algae_ink"),
      dye_synthetic: dm.includes("synthetic"),
      dye_natural_other: parsed.data.dye_natural_other?.trim() || null,
      recycle_fiber: rs.includes("fiber"),
      recycle_fabric: rs.includes("fabric"),
      recycle_metal: rs.includes("metal"),
      recycle_accepts_waste: rs.includes("accepts_waste"),
      recycle_shredding: rs.includes("shredding"),
      reuse_upcycling: rv.includes("upcycling"),
      reuse_vintage: rv.includes("vintage"),
      comm_workshops: co.includes("workshops"),
      comm_csa: co.includes("csa"),
      comm_tours: co.includes("tours"),
      comm_hiring: co.includes("hiring"),
      comm_volunteer: co.includes("volunteer"),
      comm_student_ambassador: co.includes("student_ambassador"),
      looking_for: parsed.data.looking_for?.trim() || null,
      have_available: parsed.data.have_available?.trim() || null,
      qty_available: parsed.data.qty_available?.trim() || null,
      price_range: parsed.data.price_range?.trim() || null,
      is_university: parsed.data.is_university ?? false,
      research_areas: parsed.data.research_areas?.trim() || null,
      open_to_collab: parsed.data.open_to_collab ?? false,
    };

    const { data: savedProfile } = await admin
      .from("organization_profiles")
      .upsert(profilePayload, { onConflict: "organization_id" })
      .select("*")
      .single();

    updatedProfile = (savedProfile as Record<string, unknown> | null) ?? null;
  } else {
    const { data: existingProfile } = await admin
      .from("organization_profiles")
      .select("*")
      .eq("organization_id", data.id)
      .maybeSingle();
    updatedProfile = (existingProfile as Record<string, unknown> | null) ?? null;
  }

  return NextResponse.json({ organization: normalizeDraft((data as Record<string, unknown>) ?? null, updatedProfile) });
}
