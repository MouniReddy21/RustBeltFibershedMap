"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DraftPayload = {
  organization: {
    full_name: string;
    business_name: string;
    short_bio: string;
    city: string;
    state: string;
    zip: string;
    producer_type: string;
    consent: boolean;
    public_contact: boolean;
    location_privacy_level: "exact" | "city_only";
    status: string;
  } | null;
};

const emptyDraft: NonNullable<DraftPayload["organization"]> = {
  full_name: "",
  business_name: "",
  short_bio: "",
  city: "",
  state: "",
  zip: "",
  producer_type: "",
  consent: false,
  public_contact: false,
  location_privacy_level: "city_only",
  status: "pending"
};

export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/onboarding/draft", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/join");
        return;
      }

      const json = (await response.json().catch(() => null)) as DraftPayload | null;
      if (json?.organization) {
        setDraft({ ...emptyDraft, ...json.organization });
      }
      setLoading(false);
    }

    load();
  }, [router]);

  async function saveDraft() {
    setSaving(true);
    setNotice("");

    const response = await fetch("/api/onboarding/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });

    const json = (await response.json().catch(() => null)) as { error?: string; organization?: DraftPayload["organization"] } | null;

    if (!response.ok) {
      setSaving(false);
      setNotice(json?.error ?? "Unable to save draft.");
      return;
    }

    if (json?.organization) {
      setDraft({ ...emptyDraft, ...json.organization });
    }
    setSaving(false);
    setNotice("Draft saved.");
  }

  async function submitForApproval() {
    setSubmitting(true);
    setNotice("");

    const response = await fetch("/api/onboarding/submit", {
      method: "POST"
    });

    const json = (await response.json().catch(() => null)) as
      | { error?: string; missing?: string[]; status?: string }
      | null;

    if (!response.ok) {
      const missing = json?.missing?.length ? ` Missing: ${json.missing.join(", ")}.` : "";
      setNotice((json?.error ?? "Unable to submit for review.") + missing);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setNotice("Submitted for admin review. You can keep editing while pending.");
    setDraft((prev) => ({ ...prev, status: json?.status ?? "pending" }));
  }

  if (loading) {
    return (
      <main>
        <p>Loading your draft profile...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Complete your profile (draft mode)</h1>
      <p>
        Save now, finish later. Your profile will not appear on the public map until you submit and an admin approves it.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0 }}>
          Current status: <strong>{draft.status}</strong>
        </p>
      </div>

      <div className="card" style={{ display: "grid", gap: "0.7rem" }}>
        <label>
          Full name
          <input
            value={draft.full_name}
            onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))}
            style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
        </label>
        <label>
          Business or project name
          <input
            value={draft.business_name}
            onChange={(event) => setDraft((prev) => ({ ...prev, business_name: event.target.value }))}
            style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
        </label>
        <label>
          Short bio
          <textarea
            rows={3}
            maxLength={150}
            value={draft.short_bio}
            onChange={(event) => setDraft((prev) => ({ ...prev, short_bio: event.target.value }))}
            style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
        </label>

        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label>
            City
            <input
              value={draft.city}
              onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <label>
            State (2-letter)
            <input
              maxLength={2}
              value={draft.state}
              onChange={(event) => setDraft((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <label>
            ZIP
            <input
              value={draft.zip}
              onChange={(event) => setDraft((prev) => ({ ...prev, zip: event.target.value }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
        </div>

        <label>
          Producer type
          <input
            value={draft.producer_type}
            onChange={(event) => setDraft((prev) => ({ ...prev, producer_type: event.target.value }))}
            placeholder="Farmer, Manufacturer, Designer, etc."
            style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
        </label>

        <label>
          Location privacy on map
          <select
            value={draft.location_privacy_level}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, location_privacy_level: event.target.value as "exact" | "city_only" }))
            }
            style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          >
            <option value="exact">Show exact location on map</option>
            <option value="city_only">Show city-level location only</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={draft.public_contact}
            onChange={(event) => setDraft((prev) => ({ ...prev, public_contact: event.target.checked }))}
          />
          Allow public contact details
        </label>

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={draft.consent}
            onChange={(event) => setDraft((prev) => ({ ...prev, consent: event.target.checked }))}
          />
          I agree for this information to appear publicly on the Rust Belt Fibershed map.
        </label>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="btn secondary" type="button" disabled={saving} onClick={saveDraft}>
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button className="btn" type="button" disabled={submitting} onClick={submitForApproval}>
            {submitting ? "Submitting..." : "Submit for admin approval"}
          </button>
          <Link className="btn secondary" href="/map">
            Explore map
          </Link>
        </div>

        {notice ? <p style={{ margin: 0 }}>{notice}</p> : null}
      </div>
    </main>
  );
}
