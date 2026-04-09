"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function SubmitPage() {
  const [locationPrivacyLevel, setLocationPrivacyLevel] = useState<"exact" | "city_only">("city_only");

  const tallyHref = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_TALLY_FORM_URL;
    if (!baseUrl) return "#";

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("location_privacy_level", locationPrivacyLevel);
      return url.toString();
    } catch {
      return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}location_privacy_level=${locationPrivacyLevel}`;
    }
  }, [locationPrivacyLevel]);

  return (
    <main>
      <h1>Join the Rust Belt Fibershed Map</h1>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <p>
          MVP intake is Tally-first. This page is the submission entry point and can host embedded Tally or
          redirect.
        </p>
        <p>
          Required consent gate: &quot;I agree for this information to appear publicly on the Rust Belt Fibershed
          map.&quot;
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: "0.35rem", minWidth: "260px" }}>
          <span>Location privacy on public map</span>
          <select
            value={locationPrivacyLevel}
            onChange={(event) => setLocationPrivacyLevel(event.target.value as "exact" | "city_only")}
            style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          >
            <option value="exact">Show exact location on map</option>
            <option value="city_only">Show city-level location only</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <a className="btn" href={tallyHref}>
          Open Intake Form
        </a>
        <Link className="btn secondary" href="/submit/confirm">
          View confirmation screen
        </Link>
      </div>
    </main>
  );
}
