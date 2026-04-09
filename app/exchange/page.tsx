import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExchangePageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

export default async function ExchangePage({ searchParams }: ExchangePageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const type = params.type === "wanted" || params.type === "offering" ? params.type : "";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("exchange_posts")
    .select(
      "id, organization_id, post_type, title, description, quantity, material_type, fiber_category, expires_at, status, organizations(profile_slug, business_name, city, state)"
    )
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(200);

  if (type) {
    query = query.eq("post_type", type);
  }

  const { data } = await query;

  const posts = (data ?? []).filter((post) => {
    if (!q) return true;
    const text = `${post.title ?? ""} ${post.description ?? ""} ${post.material_type ?? ""} ${post.fiber_category ?? ""}`.toLowerCase();
    return text.includes(q);
  });

  return (
    <main>
      <h1>Fiber Exchange Board</h1>
      <p>Browse local &quot;I have&quot; and &quot;I need&quot; posts from listed members.</p>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link className="btn secondary" href="/exchange/manage">
          Manage your posts
        </Link>
      </div>

      <form className="card" style={{ marginBottom: "1rem", display: "grid", gap: "0.6rem" }}>
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by fiber, material, or keyword"
          style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        />
        <select
          name="type"
          defaultValue={type}
          style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        >
          <option value="">All posts</option>
          <option value="offering">I have</option>
          <option value="wanted">I need</option>
        </select>
        <button className="btn" type="submit">
          Apply filters
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {posts.length === 0 ? <div className="card">No active exchange posts match your filters.</div> : null}
        {posts.map((post) => {
          const org = Array.isArray(post.organizations) ? post.organizations[0] : post.organizations;
          const profileSlug = org?.profile_slug ?? null;
          const profileHref = profileSlug ? `/profiles/${profileSlug}` : "/map";

          return (
            <article key={post.id} className="card">
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
                {post.post_type === "offering" ? "I have" : "I need"}
              </p>
              <h2 style={{ marginTop: "0.35rem", marginBottom: "0.35rem", fontSize: "1.1rem" }}>{post.title}</h2>
              {post.description ? <p style={{ marginTop: 0 }}>{post.description}</p> : null}
              <p style={{ margin: "0 0 0.45rem", fontSize: "0.9rem" }}>
                {post.material_type ? `Material: ${post.material_type}. ` : ""}
                {post.fiber_category ? `Fiber: ${post.fiber_category}. ` : ""}
                {post.quantity ? `Qty: ${post.quantity}. ` : ""}
              </p>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                {org?.business_name ?? "Member"} - {org?.city ?? ""}
                {org?.state ? `, ${org.state}` : ""}
              </p>
              <Link className="btn secondary" href={profileHref}>
                Contact this producer
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
