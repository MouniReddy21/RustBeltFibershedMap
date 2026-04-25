import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CATEGORIES = [
  { icon: "🐑", label: "Animal Products & Wool", href: "/map?type=animal" },
  { icon: "🌱", label: "Plant Fibers", href: "/map?fiber=hemp" },
  { icon: "⚙️", label: "Fiber Mills & Manufacturing", href: "/map?type=mill" },
  { icon: "♻️", label: "Recycling & Waste Fiber", href: "/map?type=recycling" },
  { icon: "🪡", label: "Mending, Upcycling & Vintage", href: "/map?type=mending" },
  { icon: "📍", label: "Community Resources", href: "/map?type=community" },
];

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  // Community stats
  const { data: orgTypes } = await supabase
    .from("organizations")
    .select("producer_type")
    .eq("status", "approved");

  const total = orgTypes?.length ?? 0;
  // Use .includes() so comma-separated multi-type values (e.g. "Farmer / fiber grower, Fiber processing & mills") are counted in each relevant category
  const farmers = orgTypes?.filter((o) => o.producer_type.includes("Farmer / fiber grower")).length ?? 0;
  const mills = orgTypes?.filter((o) => o.producer_type.includes("Fiber processing & mills")).length ?? 0;
  const makers =
    orgTypes?.filter(
      (o) =>
        o.producer_type.includes("Designer / maker") ||
        o.producer_type.includes("Mending / upcycling / vintage")
    ).length ?? 0;

  // Recent exchange posts
  const { data: recentPosts } = await supabase
    .from("exchange_posts")
    .select(
      "id, post_type, title, fiber_category, organizations(business_name, city, state, profile_slug)"
    )
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(3);

  const posts = recentPosts ?? [];

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">Rust Belt Region · Local Textile Economy</p>
        <h1 className="hero-title">
          Rustbelt Fibershed
          <br />
          Community Map
        </h1>
        <p className="hero-subtitle">
          Discover farmers, fiber mills, designers, and makers building a local textile economy
          across the Rust Belt region. Find your fiber neighbors.
        </p>
        <div className="hero-actions">
          <Link className="btn" href="/map">
            Explore the Map
          </Link>
          <Link className="btn secondary" href="/submit">
            Submit Your Listing
          </Link>
        </div>
      </section>

      {total > 0 ? (
        <div className="stats-bar">
          <div className="stats-bar-inner">
            <div className="stat-item">
              <span className="stat-number">{total}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">{farmers}</span>
              <span className="stat-label">Farmers &amp; Growers</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">{mills}</span>
              <span className="stat-label">Mills &amp; Processors</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">{makers}</span>
              <span className="stat-label">Designers &amp; Makers</span>
            </div>
          </div>
        </div>
      ) : null}

      <section className="categories-section">
        <h2>Who&rsquo;s on the map</h2>
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label} className="category-card" href={cat.href}>
              <span className="category-icon">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {posts.length > 0 ? (
        <section className="exchange-strip">
          <div className="exchange-strip-header">
            <h2>Recent in the Exchange</h2>
            <Link href="/exchange" className="exchange-strip-link">
              See all posts &rarr;
            </Link>
          </div>
          <div className="exchange-post-grid">
            {posts.map((post) => {
              const org = Array.isArray(post.organizations)
                ? post.organizations[0]
                : post.organizations;
              const isOffering = post.post_type === "offering";
              const postHref = org?.profile_slug ? `/exchange?org=${org.profile_slug}` : "/exchange";

              return (
                <Link key={post.id} href={postHref} className="exchange-post-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.4rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: isOffering ? "#edf5d8" : "#fdf4e0",
                        color: isOffering ? "var(--accent-strong)" : "var(--brown)",
                        border: `1px solid ${isOffering ? "#b8d068" : "#e0c060"}`,
                      }}
                    >
                      {isOffering ? "I have" : "I need"}
                    </span>
                    {post.fiber_category ? (
                      <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                        {post.fiber_category}
                      </span>
                    ) : null}
                  </div>
                  <p className="exchange-post-title">{post.title}</p>
                  <p className="exchange-post-meta">
                    {org?.business_name ?? "Member"}
                    {org?.city ? ` · ${org.city}` : ""}
                    {org?.state ? `, ${org.state}` : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
