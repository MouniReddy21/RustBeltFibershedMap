import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExchangePost } from "@/lib/types";
import ManageExchangeClient from "./ui";

export const dynamic = "force-dynamic";

export default async function ManageExchangePage() {
  const supabase = await createSupabaseServerClient();
  const { data: authResult } = await supabase.auth.getUser();
  const user = authResult.user;

  if (!user) {
    redirect("/exchange");
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, business_name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (orgError || !org) {
    return (
      <main>
        <h1>Manage Exchange Posts</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>No linked organization was found for this account.</p>
          <Link className="btn secondary" href="/submit">
            Submit your listing first
          </Link>
        </div>
      </main>
    );
  }

  const { data: posts } = await supabase
    .from("exchange_posts")
    .select(
      "id, organization_id, post_type, title, description, fiber_category, material_type, quantity, price_or_trade_terms, photo_urls, posted_at, expires_at, status"
    )
    .eq("organization_id", org.id)
    .order("posted_at", { ascending: false })
    .limit(100);

  return (
    <main>
      <h1>Manage Exchange Posts</h1>
      <p>
        Create and maintain your &quot;I have&quot; and &quot;I need&quot; posts for {org.business_name}.
      </p>
      {org.status !== "approved" ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            Your listing is currently <strong>{org.status}</strong>. You can view existing posts, but posting to the
            exchange requires an approved listing.
          </p>
        </div>
      ) : null}
      <ManageExchangeClient initialPosts={(posts ?? []) as ExchangePost[]} orgId={org.id} />
    </main>
  );
}
