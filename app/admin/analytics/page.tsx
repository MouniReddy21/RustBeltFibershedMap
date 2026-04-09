import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type OrgRow = {
  id: string;
  producer_type: string;
  county: string | null;
  city: string;
  state: string;
};

type ProfileRow = {
  waste_wool_avail: boolean;
  is_university: boolean;
  fiber_alpaca: boolean;
  fiber_sheep_wool: boolean;
  fiber_angora: boolean;
  fiber_mohair: boolean;
  fiber_cashmere: boolean;
  fiber_llama: boolean;
};

type ExchangeRow = {
  post_type: "offering" | "wanted";
  material_type: string | null;
  fiber_category: string | null;
};

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function AdminAnalyticsPage() {
  let supabase;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return (
      <main>
        <h1>Admin Analytics</h1>
        <div className="card">
          <p style={{ margin: 0 }}>Analytics is unavailable because admin environment variables are not configured.</p>
        </div>
      </main>
    );
  }

  const { data: orgRows } = await supabase
    .from("organizations")
    .select("id, producer_type, county, city, state")
    .eq("status", "approved")
    .limit(5000);

  const { data: profileRows } = await supabase
    .from("organization_profiles")
    .select(
      "waste_wool_avail, is_university, fiber_alpaca, fiber_sheep_wool, fiber_angora, fiber_mohair, fiber_cashmere, fiber_llama, organizations!inner(status)"
    )
    .eq("organizations.status", "approved")
    .limit(5000);

  const { data: exchangeRows } = await supabase
    .from("exchange_posts")
    .select("post_type, material_type, fiber_category, organizations!inner(status)")
    .eq("status", "active")
    .eq("organizations.status", "approved")
    .limit(5000);

  const orgs = (orgRows ?? []) as OrgRow[];
  const profiles = (profileRows ?? []) as ProfileRow[];
  const exchange = (exchangeRows ?? []) as ExchangeRow[];

  const producerCounts = countBy(orgs, (row) => row.producer_type || "Unknown");

  const fiberTotals = [
    { label: "alpaca", count: profiles.filter((row) => row.fiber_alpaca).length },
    { label: "sheep wool", count: profiles.filter((row) => row.fiber_sheep_wool).length },
    { label: "angora", count: profiles.filter((row) => row.fiber_angora).length },
    { label: "mohair", count: profiles.filter((row) => row.fiber_mohair).length },
    { label: "cashmere", count: profiles.filter((row) => row.fiber_cashmere).length },
    { label: "llama", count: profiles.filter((row) => row.fiber_llama).length }
  ].sort((a, b) => b.count - a.count);

  const exchangeSupply = countBy(
    exchange.filter((row) => row.post_type === "offering"),
    (row) => row.material_type || row.fiber_category || "unspecified"
  ).slice(0, 8);

  const exchangeDemand = countBy(
    exchange.filter((row) => row.post_type === "wanted"),
    (row) => row.material_type || row.fiber_category || "unspecified"
  ).slice(0, 8);

  const countyMap = new Map<string, { farmers: number; mills: number }>();

  for (const org of orgs) {
    const county = (org.county || "Unknown county").trim();
    const current = countyMap.get(county) ?? { farmers: 0, mills: 0 };

    if (org.producer_type === "Farmer") {
      current.farmers += 1;
    }

    if (org.producer_type === "Fiber processing & mills") {
      current.mills += 1;
    }

    countyMap.set(county, current);
  }

  const regionalGaps = Array.from(countyMap.entries())
    .filter(([, value]) => value.farmers > 0 && value.mills === 0)
    .map(([county, value]) => ({ county, farmers: value.farmers }))
    .sort((a, b) => b.farmers - a.farmers)
    .slice(0, 10);

  const wasteWoolCount = profiles.filter((row) => row.waste_wool_avail).length;
  const universityCount = profiles.filter((row) => row.is_university).length;

  return (
    <main>
      <h1>Admin Analytics Dashboard</h1>
      <p>Internal insights for supply, demand, and regional network gaps.</p>

      <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="card">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Approved listings</p>
          <h2 style={{ margin: "0.2rem 0 0" }}>{orgs.length}</h2>
        </div>
        <div className="card">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Active exchange posts</p>
          <h2 style={{ margin: "0.2rem 0 0" }}>{exchange.length}</h2>
        </div>
        <div className="card">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Waste wool participants</p>
          <h2 style={{ margin: "0.2rem 0 0" }}>{wasteWoolCount}</h2>
        </div>
        <div className="card">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Universities and research orgs</p>
          <h2 style={{ margin: "0.2rem 0 0" }}>{universityCount}</h2>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: "1rem" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Listings by producer type</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {producerCounts.map((row) => (
              <li key={row.label}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Most available fibers</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {fiberTotals.map((row) => (
              <li key={row.label}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Exchange supply (top)</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {exchangeSupply.length === 0 ? <li>No supply posts yet.</li> : null}
            {exchangeSupply.map((row) => (
              <li key={row.label}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Exchange demand (top)</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {exchangeDemand.length === 0 ? <li>No demand posts yet.</li> : null}
            {exchangeDemand.map((row) => (
              <li key={row.label}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Regional gap insight: farmers without mills by county</h2>
        <p style={{ marginTop: 0 }}>
          Counties listed below have one or more approved farmers and zero approved fiber processing or mill listings.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {regionalGaps.length === 0 ? <li>No current farmer-to-mill county gaps detected.</li> : null}
          {regionalGaps.map((row) => (
            <li key={row.county}>
              {row.county}: {row.farmers} farmer listing{row.farmers === 1 ? "" : "s"}, 0 mills
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
