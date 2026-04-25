import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "./components/sign-out-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rust Belt Fibershed",
  description: "Public discovery map and directory for the Rust Belt Fibershed network."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const isAdmin = user?.app_metadata?.is_admin === true;

  // Prefer app_metadata (populated by syncOrgMetaToAuth on status changes) to avoid a DB query.
  // Fall back to DB only for users whose metadata hasn't been written yet.
  const metaStatus = user?.app_metadata?.org_status as string | undefined;
  const metaSlug = user?.app_metadata?.org_profile_slug as string | null | undefined;
  const hasOrgMeta = !isAdmin && user && metaStatus !== undefined;

  const { data: org } = !hasOrgMeta && user && !isAdmin
    ? await supabase.from("organizations").select("status, profile_slug").eq("auth_user_id", user.id).maybeSingle()
    : { data: hasOrgMeta ? { status: metaStatus, profile_slug: metaSlug ?? null } : null };

  const accountStatus = isAdmin ? "admin" : (org?.status ?? "guest");
  const accountStatusLabel =
    accountStatus === "admin"
      ? "Admin"
      : accountStatus === "approved"
        ? "Approved"
        : accountStatus === "pending"
          ? "Pending Review"
          : accountStatus === "rejected"
            ? "Needs Update"
            : accountStatus === "suspended"
              ? "Suspended"
              : accountStatus === "archived"
                ? "Archived"
                : "Guest";
  const accountStatusClass =
    accountStatus === "admin"
      ? "status-chip status-admin"
      : accountStatus === "approved"
        ? "status-chip status-approved"
        : accountStatus === "pending"
          ? "status-chip status-pending"
          : accountStatus === "rejected"
            ? "status-chip status-rejected"
            : accountStatus === "suspended"
              ? "status-chip status-suspended"
              : accountStatus === "archived"
                ? "status-chip status-archived"
                : "status-chip status-guest";

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="site-logo">
              Rustbelt Fibershed
              <span>Community Map</span>
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/map">Map</Link>
              <Link href="/exchange">Exchange</Link>
              <Link href="/submit">Submit</Link>
            </nav>
            <div className="account-nav">
              {user && <span className={accountStatusClass}>{accountStatusLabel}</span>}
              {user ? (
                <>
                  {isAdmin ? (
                    <>
                      <Link className="btn secondary" href="/admin/submissions">
                        Submissions
                      </Link>
                      <Link className="btn secondary" href="/admin/analytics">
                        Analytics
                      </Link>
                    </>
                  ) : (
                    <>
                      {accountStatus === "approved" && org?.profile_slug && (
                        <Link className="btn secondary" href={`/profiles/${org.profile_slug}`}>
                          View Profile
                        </Link>
                      )}
                      <Link className="btn secondary" href="/onboarding">
                        Edit Profile
                      </Link>
                    </>
                  )}
                  <SignOutButton />
                </>
              ) : (
                <Link className="btn secondary" href="/join">
                  Join / Sign In
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
