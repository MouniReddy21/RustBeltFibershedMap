import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RelayForm from "./relay-form";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  if (!slug) {
    notFound();
  }

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, business_name, short_bio, city, county, state, producer_type, website, instagram, phone, public_contact, location_privacy_level, lat, lng, status"
    )
    .eq("profile_slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();

  const { data: exchangePosts } = await supabase
    .from("exchange_posts")
    .select("id, post_type, title, description, quantity, material_type, fiber_category, expires_at, status")
    .eq("organization_id", org.id)
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(20);

  const mapLat = org.location_privacy_level === "city_only" ? null : org.lat;
  const mapLng = org.location_privacy_level === "city_only" ? null : org.lng;
  const shareUrl = `/profiles/${slug}`;

  return (
    <main>
      <h1>{org.business_name}</h1>
      <p>{org.short_bio}</p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ marginTop: 0 }}>
          <strong>Producer type:</strong> {org.producer_type}
        </p>
        <p>
          <strong>Location:</strong> {org.city}
          {org.county ? `, ${org.county} County` : ""}, {org.state}
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link className="btn secondary" href={shareUrl}>
            Share profile link
          </Link>
          <Link className="btn secondary" href="/submit">
            Request profile edit
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Mini-map location</h2>
        {mapLat !== null && mapLng !== null ? (
          <p style={{ marginBottom: 0 }}>
            Exact map pin available at {mapLat.toFixed(4)}, {mapLng.toFixed(4)}.
          </p>
        ) : (
          <p style={{ marginBottom: 0 }}>
            This member chose city-level privacy. Map displays city or county context only.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Exchange board posts</h2>
        {exchangePosts && exchangePosts.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {exchangePosts.map((post) => (
              <article
                key={post.id}
                style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem" }}
              >
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                  {post.post_type === "offering" ? "I have" : "I need"}
                </p>
                <h3 style={{ margin: "0.25rem 0" }}>{post.title}</h3>
                {post.description ? <p style={{ marginTop: 0 }}>{post.description}</p> : null}
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  {post.material_type ? `Material: ${post.material_type}. ` : ""}
                  {post.fiber_category ? `Fiber: ${post.fiber_category}. ` : ""}
                  {post.quantity ? `Qty: ${post.quantity}.` : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ marginBottom: 0 }}>No active exchange posts yet.</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Contact</h2>
        {org.public_contact ? (
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {org.website ? (
              <a href={org.website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
            {org.instagram ? (
              <a href={org.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            ) : null}
            {org.phone ? <a href={`tel:${org.phone}`}>{org.phone}</a> : null}
            {!org.website && !org.instagram && !org.phone ? (
              <p style={{ margin: 0 }}>No public contact channels listed.</p>
            ) : null}
          </div>
        ) : (
          <RelayForm toOrganizationId={org.id} businessName={org.business_name} />
        )}
      </div>

      {profile ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Directory details</h2>
          <p>
            <strong>Looking for:</strong> {profile.looking_for || "Not specified"}
          </p>
          <p>
            <strong>Have available:</strong> {profile.have_available || "Not specified"}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Quantity:</strong> {profile.qty_available || "Not specified"}
          </p>
        </div>
      ) : null}
    </main>
  );
}
