import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function str(value: unknown, fallback = ""): string {
  return String(value ?? "").trim() || fallback;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Required field validation
  const missing: string[] = [];
  if (!str(body.full_name)) missing.push("full_name");
  if (!str(body.email) || !str(body.email).includes("@")) missing.push("email");
  if (!str(body.city)) missing.push("city");
  if (!body.consent) missing.push("consent");

  if (missing.length > 0) {
    return NextResponse.json({ error: "Please complete all required fields.", missing }, { status: 400 });
  }

  const fullName = str(body.full_name);

  const orgInput = {
    full_name: fullName,
    business_name: str(body.business_name) || fullName,
    email: str(body.email).toLowerCase(),
    short_bio: str(body.short_bio).slice(0, 500),
    city: str(body.city),
    state: (str(body.state, "OH").toUpperCase()).slice(0, 2) || "OH",
    zip: str(body.zip),
    phone: str(body.phone) || null,
    website: str(body.website) || null,
    instagram: str(body.instagram) || null,
    producer_type: (() => {
      const types = arr(body.producer_types);
      const other = str(body.producer_type_other);
      const all = other ? [...types, other] : types;
      return all.join(", ") || "N/A";
    })(),
    consent: true,
    public_contact: Boolean(body.public_contact),
    location_privacy_level: body.location_privacy_level === "exact" ? "exact" : ("city_only" as const),
    status: "pending" as const
  };

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Insert organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert(orgInput)
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Failed to save your submission. Please try again." }, { status: 500 });
  }

  // 2. Insert organization_profiles
  const af = arr(body.animal_fibers);
  const fc = arr(body.fiber_crops);
  const ps = arr(body.processing_services);
  const dm = arr(body.dye_methods);
  const rs = arr(body.recycling_services);
  const rv = arr(body.reuse_services);
  const co = arr(body.community_offerings);

  const profileInput = {
    organization_id: org.id,

    is_farmer: arr(body.producer_types).includes("Farmer / fiber grower"),
    is_mill: arr(body.producer_types).includes("Fiber processing & mills"),
    is_manufacturer: arr(body.producer_types).includes("Designer / maker"),
    is_designer: arr(body.producer_types).includes("Designer / maker"),

    fiber_alpaca: af.includes("alpaca"),
    fiber_sheep_wool: af.includes("sheep_wool"),
    fiber_angora: af.includes("angora"),
    fiber_mohair: af.includes("mohair"),
    fiber_cashmere: af.includes("cashmere"),
    fiber_llama: af.includes("llama"),
    fiber_animal_other: str(body.fiber_animal_other) || null,
    waste_wool_avail: Boolean(body.waste_wool_avail),

    crop_cotton: fc.includes("cotton"),
    crop_flax_linen: fc.includes("flax_linen"),
    crop_hemp: fc.includes("hemp"),
    crop_nettle: fc.includes("nettle"),
    crop_other: str(body.crop_other) || null,

    proc_dyeing: ps.includes("dyeing"),
    proc_printing: ps.includes("printing"),
    proc_spinning: ps.includes("spinning"),
    proc_weaving: ps.includes("weaving"),
    proc_felting: ps.includes("felting"),
    proc_carding: ps.includes("carding"),
    proc_shearing: ps.includes("shearing"),
    proc_tailoring: ps.includes("tailoring"),
    proc_mending: ps.includes("mending"),
    proc_cut_sew: ps.includes("cut_sew"),

    dye_garden: dm.includes("garden"),
    dye_indigo: dm.includes("indigo"),
    dye_woad: dm.includes("woad"),
    dye_algae_ink: dm.includes("algae_ink"),
    dye_synthetic: dm.includes("synthetic"),
    dye_natural_other: str(body.dye_natural_other) || null,

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

    looking_for: str(body.looking_for) || null,
    have_available: str(body.have_available) || null,
    qty_available: str(body.qty_available) || null,
    price_range: str(body.price_range) || null,

    is_university: Boolean(body.is_university),
    research_areas: str(body.research_areas) || null,
    open_to_collab: Boolean(body.open_to_collab)
  };

  const { error: profileError } = await supabase
    .from("organization_profiles")
    .insert(profileInput);

  if (profileError) {
    // Non-fatal — org record exists, admin can fill profile detail later
    console.error("organization_profiles insert failed:", profileError.message);
  }

  // 3. Insert approval record
  const { error: approvalError } = await supabase.from("approvals").insert({
    organization_id: org.id,
    status: "submitted",
    intake_source: "web_form",
    intake_raw_response: body,
    consent_accepted: true,
    consent_accepted_at: nowIso
  });

  if (approvalError) {
    return NextResponse.json({ error: "Failed to record your submission. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, organizationId: org.id }, { status: 202 });
}
