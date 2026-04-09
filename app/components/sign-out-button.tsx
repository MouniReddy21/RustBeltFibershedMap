"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);

    await fetch("/api/auth/signout", {
      method: "POST"
    });

    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <button className="btn secondary" type="button" onClick={signOut} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
