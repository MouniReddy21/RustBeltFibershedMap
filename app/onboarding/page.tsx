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

  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    pending: { bg: "#fff3d6", color: "#6b3f00", border: "#e1c07d" },
    approved: { bg: "#def7e8", color: "#0f5132", border: "#84c6a7" },
    rejected: { bg: "#f8d7da", color: "#842029", border: "#d39ca1" },
    draft: { bg: "var(--panel)", color: "var(--muted)", border: "var(--border)" },
  };
  const chipStyle = statusColors[draft.status] ?? statusColors.draft;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>My Profile</h1>
        <span style={{
          padding: "0.2rem 0.7rem",
          borderRadius: "999px",
          fontSize: "0.8rem",
          fontWeight: 700,
          background: chipStyle.bg,
          color: chipStyle.color,
          border: `1px solid ${chipStyle.border}`,
        }}>
          {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
        </span>
      </div>
      <p className="page-lead">
        Save now, finish later. Your profile will not appear on the public map until you submit and an admin approves it.
      </p>

      <div className="card" style={{ display: "grid", gap: "0.85rem", maxWidth: "600px" }}>
        <label>
          Full name
          <input
            value={draft.full_name}
            onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))}
            className="field-input"
          />
        </label>
        <label>
          Business or project name
          <input
            value={draft.business_name}
            onChange={(event) => setDraft((prev) => ({ ...prev, business_name: event.target.value }))}
            className="field-input"
          />
        </label>
        <label>
          Short bio <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>(500 chars max)</span>
          <textarea
            rows={3}
            maxLength={500}
            value={draft.short_bio}
            onChange={(event) => setDraft((prev) => ({ ...prev, short_bio: event.target.value }))}
            className="field-input"
          />
        </label>

        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <label>
            City
            <input
              value={draft.city}
              onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))}
              className="field-input"
            />
          </label>
          <label>
            State
            <input
              maxLength={2}
              placeholder="OH"
              value={draft.state}
              onChange={(event) => setDraft((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              className="field-input"
            />
          </label>
          <label>
            ZIP
            <input
              value={draft.zip}
              onChange={(event) => setDraft((prev) => ({ ...prev, zip: event.target.value }))}
              className="field-input"
            />
          </label>
        </div>

        <label>
          Producer type
          <input
            value={draft.producer_type}
            onChange={(event) => setDraft((prev) => ({ ...prev, producer_type: event.target.value }))}
            placeholder="Farmer, Manufacturer, Designer, etc."
            className="field-input"
          />
        </label>

        <label>
          Location privacy on map
          <select
            value={draft.location_privacy_level}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, location_privacy_level: event.target.value as "exact" | "city_only" }))
            }
            className="field-input"
          >
            <option value="city_only">Show city-level location only (recommended)</option>
            <option value="exact">Show exact location on map</option>
          </select>
        </label>

        <div style={{ display: "grid", gap: "0.5rem", paddingTop: "0.25rem" }}>
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draft.public_contact}
              onChange={(event) => setDraft((prev) => ({ ...prev, public_contact: event.target.checked }))}
              style={{ marginTop: "0.15rem" }}
            />
            <span>Allow visitors to see my contact details publicly</span>
          </label>

          <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draft.consent}
              onChange={(event) => setDraft((prev) => ({ ...prev, consent: event.target.checked }))}
              style={{ marginTop: "0.15rem" }}
            />
            <span>I agree for this information to appear publicly on the Rust Belt Fibershed map.</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.25rem", borderTop: "1px solid var(--border)" }}>
          <button className="btn secondary" type="button" disabled={saving} onClick={saveDraft}>
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button className="btn" type="button" disabled={submitting} onClick={submitForApproval}>
            {submitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>

        {notice ? (
          <p className={`notice${notice.toLowerCase().includes("unable") || notice.toLowerCase().includes("missing") ? " error" : ""}`}>
            {notice}
          </p>
        ) : null}
      </div>
    </main>
  );
}
