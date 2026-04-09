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

  const { data: org } = user
    ? await supabase.from("organizations").select("status").eq("auth_user_id", user.id).maybeSingle()
    : { data: null };

  const accountStatus = org?.status ?? "guest";
  const accountStatusLabel =
    accountStatus === "approved"
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
    accountStatus === "approved"
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
            <nav className="site-nav" aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/map">Map</Link>
              <Link href="/submit">Submit</Link>
              <Link href="/exchange">Exchange</Link>
            </nav>
            <div className="account-nav">
              <span className={accountStatusClass}>{accountStatusLabel}</span>
              {user ? (
                <>
                  <Link className="btn secondary" href="/onboarding">
                    My Profile
                  </Link>
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
