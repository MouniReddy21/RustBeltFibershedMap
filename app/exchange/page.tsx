import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ExchangeBoard from "./board";

const FIBER_CATEGORIES = [
  "Sheep Wool",
  "Waste Wool",
  "Alpaca",
  "Mohair",
  "Angora",
  "Cashmere",
  "Llama",
  "Cotton",
  "Flax / Linen",
  "Hemp",
  "Nettle",
  "Blended / Mixed",
  "Other",
] as const;

type ExchangePageProps = {
  searchParams: Promise<{ q?: string; type?: string; fiber?: string }>;
};

export default async function ExchangePage({ searchParams }: ExchangePageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const type = params.type === "wanted" || params.type === "offering" ? params.type : "";
  const fiber = FIBER_CATEGORIES.includes(params.fiber as (typeof FIBER_CATEGORIES)[number])
    ? (params.fiber as string)
    : "";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("exchange_posts")
    .select(
      "id, organization_id, post_type, title, description, quantity, material_type, fiber_category, price_or_trade_terms, photo_urls, expires_at, status, organizations(profile_slug, business_name, city, state)"
    )
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(200);

  if (type) {
    query = query.eq("post_type", type);
  }

  if (fiber) {
    query = query.eq("fiber_category", fiber);
  }

  const { data } = await query;

  const posts = (data ?? []).filter((post) => {
    if (!q) return true;
    const text =
      `${post.title ?? ""} ${post.description ?? ""} ${post.material_type ?? ""}`.toLowerCase();
    return text.includes(q);
  });

  const activeFilters = [type, fiber].filter(Boolean).length;

  return (
    <main>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.4rem" }}>Fiber Exchange Board</h1>
          <p className="page-lead" style={{ margin: 0 }}>
            Local &ldquo;I have&rdquo; and &ldquo;I need&rdquo; posts from listed members.
          </p>
        </div>
        <Link
          className="btn secondary"
          href="/exchange/manage"
          style={{ whiteSpace: "nowrap", alignSelf: "center" }}
        >
          Manage your posts
        </Link>
      </div>

      <form
        className="card"
        style={{ margin: "1.25rem 0", display: "grid", gap: "0.6rem", maxWidth: "660px" }}
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by material, keyword, or description"
          className="field-input"
          style={{ marginTop: 0 }}
        />
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <select
            name="type"
            defaultValue={type}
            className="field-input"
            style={{ flex: 1, minWidth: "120px", marginTop: 0 }}
          >
            <option value="">All posts</option>
            <option value="offering">I have</option>
            <option value="wanted">I need</option>
          </select>
          <select
            name="fiber"
            defaultValue={fiber}
            className="field-input"
            style={{ flex: 2, minWidth: "160px", marginTop: 0 }}
          >
            <option value="">All fibers</option>
            {FIBER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            Search
          </button>
        </div>
        {(activeFilters > 0 || q) && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {posts.length} {posts.length === 1 ? "result" : "results"}
              {fiber ? ` · ${fiber}` : ""}
              {type ? ` · ${type === "offering" ? "I have" : "I need"}` : ""}
              {q ? ` · "${params.q}"` : ""}
            </span>
            <Link
              href="/exchange"
              style={{ fontSize: "0.82rem", color: "var(--accent-strong)", fontWeight: 600 }}
            >
              Clear filters
            </Link>
          </div>
        )}
      </form>

      <ExchangeBoard posts={posts as Parameters<typeof ExchangeBoard>[0]["posts"]} />
    </main>
  );
}
