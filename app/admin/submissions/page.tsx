import ReviewControls from "./review-controls";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  organization_id: string;
  status: string;
  intake_source: string;
  created_at: string;
  rejection_reason: string | null;
  organizations:
    | {
        id: string;
        business_name: string;
        full_name: string;
        city: string;
        state: string;
        email: string;
        producer_type: string;
        status: string;
        profile_slug: string | null;
      }
    | Array<{
        id: string;
        business_name: string;
        full_name: string;
        city: string;
        state: string;
        email: string;
        producer_type: string;
        status: string;
        profile_slug: string | null;
      }>;
};

async function getSubmissions(): Promise<SubmissionRow[]> {
  let supabase;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("approvals")
    .select(
      "id, organization_id, status, intake_source, created_at, rejection_reason, organizations(id, business_name, full_name, city, state, email, producer_type, status, profile_slug)"
    )
    .in("status", ["submitted", "under_review"])
    .order("created_at", { ascending: true })
    .limit(300);

  if (error || !data) {
    return [];
  }

  return data as SubmissionRow[];
}

export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const submissions = await getSubmissions();

  return (
    <main>
      <h1>Admin Submission Queue</h1>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <Link className="btn secondary" href="/admin/analytics">
          View analytics dashboard
        </Link>
      </div>
      <div className="card">
        <p style={{ marginTop: 0 }}>Review incoming listings and publish approved members to the public map.</p>
        {submissions.length === 0 ? (
          <p style={{ marginBottom: 0 }}>No pending submissions right now.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {submissions.map((submission) => {
              const org = Array.isArray(submission.organizations)
                ? submission.organizations[0]
                : submission.organizations;

              if (!org) {
                return null;
              }

              return (
                <article
                  key={submission.id}
                  style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.85rem" }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: "0.4rem", fontSize: "1.05rem" }}>{org.business_name}</h2>
                  <p style={{ margin: "0 0 0.35rem" }}>
                    {org.city}, {org.state} - {org.producer_type}
                  </p>
                  <p style={{ margin: "0 0 0.65rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                    Contact: {org.full_name} ({org.email})
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                    <Link className="btn secondary" href={`/admin/submissions/${submission.id}`}>
                      Open review
                    </Link>
                  </div>
                  <ReviewControls approvalId={submission.id} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
