import Link from "next/link";
import ReviewControls from "../review-controls";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SubmissionDetail = {
  approval: {
    id: string;
    organization_id: string;
    status: string;
    intake_source: string;
    created_at: string;
    rejection_reason: string | null;
  } | null;
  organization: {
    id: string;
    full_name: string;
    business_name: string;
    short_bio: string;
    email: string;
    phone: string | null;
    website: string | null;
    instagram: string | null;
    city: string;
    state: string;
    zip: string;
    county: string | null;
    lat: number | null;
    lng: number | null;
    producer_type: string;
    public_contact: boolean;
    consent: boolean;
    location_privacy_level: string;
    status: string;
    profile_slug: string | null;
    reviewed_at: string | null;
    approved_at: string | null;
  } | null;
  profile: {
    is_farmer: boolean;
    is_mill: boolean;
    is_manufacturer: boolean;
    is_designer: boolean;
    fiber_alpaca: boolean;
    fiber_sheep_wool: boolean;
    fiber_angora: boolean;
    fiber_mohair: boolean;
    fiber_cashmere: boolean;
    fiber_llama: boolean;
    waste_wool_avail: boolean;
    is_university: boolean;
    looking_for: string | null;
    have_available: string | null;
    qty_available: string | null;
    price_range: string | null;
  } | null;
  exchangePosts: Array<{
    id: string;
    post_type: string;
    title: string;
    description: string | null;
    fiber_category: string | null;
    material_type: string | null;
    quantity: string | null;
    price_or_trade_terms: string | null;
    status: string;
    expires_at: string;
  }>;
};

async function getSubmissionDetail(id: string): Promise<SubmissionDetail> {
  let supabase;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return { approval: null, organization: null, profile: null, exchangePosts: [] };
  }

  const { data: approval } = await supabase
    .from("approvals")
    .select("id, organization_id, status, intake_source, created_at, rejection_reason")
    .eq("id", id)
    .maybeSingle();

  if (!approval) {
    return { approval: null, organization: null, profile: null, exchangePosts: [] };
  }

  const [{ data: organization }, { data: profileRows }, { data: exchangePosts }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, full_name, business_name, short_bio, email, phone, website, instagram, city, state, zip, county, lat, lng, producer_type, public_contact, consent, location_privacy_level, status, profile_slug, reviewed_at, approved_at"
      )
      .eq("id", approval.organization_id)
      .maybeSingle(),
    supabase
      .from("organization_profiles")
      .select(
        "is_farmer, is_mill, is_manufacturer, is_designer, fiber_alpaca, fiber_sheep_wool, fiber_angora, fiber_mohair, fiber_cashmere, fiber_llama, waste_wool_avail, is_university, looking_for, have_available, qty_available, price_range"
      )
      .eq("organization_id", approval.organization_id)
      .maybeSingle(),
    supabase
      .from("exchange_posts")
      .select(
        "id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, status, expires_at"
      )
      .eq("organization_id", approval.organization_id)
      .order("created_at", { ascending: false })
  ]);

  return {
    approval: approval as SubmissionDetail["approval"],
    organization: (organization as SubmissionDetail["organization"]) ?? null,
    profile: (profileRows as SubmissionDetail["profile"]) ?? null,
    exchangePosts: (exchangePosts ?? []) as SubmissionDetail["exchangePosts"]
  };
}

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0 }}>{typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "-"}</p>
    </div>
  );
}

export default async function AdminSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getSubmissionDetail(id);

  if (!detail.approval || !detail.organization) {
    return (
      <main>
        <h1>Submission not found</h1>
        <Link className="btn secondary" href="/admin/submissions">
          Back to queue
        </Link>
      </main>
    );
  }

  const org = detail.organization;

  return (
    <main>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link className="btn secondary" href="/admin/submissions">
          Back to queue
        </Link>
        <Link className="btn secondary" href="/admin/analytics">
          View analytics dashboard
        </Link>
      </div>

      <h1 style={{ marginBottom: "0.35rem" }}>{org.business_name}</h1>
      <p className="page-lead">Review the submitted listing details and approve or reject it below.</p>

      <div className="card" style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Field label="Submission status" value={detail.approval.status} />
          <Field label="Organization status" value={org.status} />
          <Field label="Location privacy" value={org.location_privacy_level} />
          <Field label="Consent" value={org.consent} />
          <Field label="Public contact" value={org.public_contact} />
          <Field label="Profile slug" value={org.profile_slug} />
        </div>

        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.05rem" }}>Contact and location</h2>
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label="Contact name" value={org.full_name} />
            <Field label="Email" value={org.email} />
            <Field label="Phone" value={org.phone} />
            <Field label="Website" value={org.website} />
            <Field label="Instagram" value={org.instagram} />
            <Field label="City" value={`${org.city}, ${org.state}`} />
            <Field label="ZIP" value={org.zip} />
            <Field label="County" value={org.county} />
            <Field label="Coordinates" value={org.lat != null && org.lng != null ? `${org.lat}, ${org.lng}` : null} />
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Short bio
            </p>
            <p style={{ margin: 0, lineHeight: 1.65 }}>{org.short_bio}</p>
          </div>
        </div>

        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.05rem" }}>Profile details</h2>
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label="Producer type" value={org.producer_type} />
            <Field label="Farmer" value={detail.profile?.is_farmer ?? false} />
            <Field label="Mill" value={detail.profile?.is_mill ?? false} />
            <Field label="Manufacturer" value={detail.profile?.is_manufacturer ?? false} />
            <Field label="Designer" value={detail.profile?.is_designer ?? false} />
            <Field label="Waste wool" value={detail.profile?.waste_wool_avail ?? false} />
            <Field label="University" value={detail.profile?.is_university ?? false} />
            <Field label="Looking for" value={detail.profile?.looking_for} />
            <Field label="Have available" value={detail.profile?.have_available} />
            <Field label="Quantity" value={detail.profile?.qty_available} />
            <Field label="Price range" value={detail.profile?.price_range} />
          </div>
        </div>

        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.05rem" }}>Exchange posts</h2>
          {detail.exchangePosts.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>No exchange posts yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {detail.exchangePosts.map((post) => (
                <article key={post.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.85rem" }}>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                    {post.post_type} · {post.status}
                  </p>
                  <h3 style={{ margin: "0 0 0.35rem", fontSize: "1rem" }}>{post.title}</h3>
                  {post.description ? <p style={{ margin: "0 0 0.45rem" }}>{post.description}</p> : null}
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                    {post.fiber_category ? `Fiber: ${post.fiber_category}` : ""}
                    {post.fiber_category && post.material_type ? " · " : ""}
                    {post.material_type ? `Material: ${post.material_type}` : ""}
                    {(post.fiber_category || post.material_type) && post.quantity ? " · " : ""}
                    {post.quantity ? `Qty: ${post.quantity}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {detail.approval.rejection_reason ? (
          <p style={{ margin: 0, color: "#842029" }}>
            Rejection reason: {detail.approval.rejection_reason}
          </p>
        ) : null}

        <ReviewControls
          approvalId={detail.approval.id}
          hasCoordinates={org.lat != null && org.lng != null}
          city={org.city}
          state={org.state}
        />
      </div>
    </main>
  );
}