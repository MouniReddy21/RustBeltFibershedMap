"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCER_TYPES } from "@/lib/producer-types";

// ── Option lists (mirrors submit/page.tsx) ─────────────────────────────────

const ANIMAL_FIBER_OPTIONS = [
  { value: "alpaca", label: "Alpaca" },
  { value: "sheep_wool", label: "Sheep wool" },
  { value: "angora", label: "Angora" },
  { value: "mohair", label: "Mohair" },
  { value: "cashmere", label: "Cashmere" },
  { value: "llama", label: "Llama" },
];

const FIBER_CROP_OPTIONS = [
  { value: "cotton", label: "Cotton" },
  { value: "flax_linen", label: "Flax / linen" },
  { value: "hemp", label: "Hemp" },
  { value: "nettle", label: "Nettle" },
];

const PROCESSING_OPTIONS = [
  { value: "dyeing", label: "Dyeing" },
  { value: "spinning", label: "Spinning" },
  { value: "weaving", label: "Weaving" },
  { value: "felting", label: "Felting" },
  { value: "carding", label: "Carding" },
  { value: "shearing", label: "Shearing" },
  { value: "tailoring", label: "Tailoring" },
  { value: "mending", label: "Mending" },
  { value: "printing", label: "Printing" },
  { value: "cut_sew", label: "Cut & sew" },
];

const DYE_OPTIONS = [
  { value: "garden", label: "Garden / natural dyes" },
  { value: "indigo", label: "Indigo" },
  { value: "woad", label: "Woad" },
  { value: "algae_ink", label: "Algae ink" },
  { value: "synthetic", label: "Synthetic dyes" },
];

const RECYCLING_OPTIONS = [
  { value: "fiber", label: "Fiber recycling" },
  { value: "fabric", label: "Fabric recycling" },
  { value: "metal", label: "Metal recycling" },
  { value: "accepts_waste", label: "Accepts waste fiber" },
  { value: "shredding", label: "Shredding / grinding" },
];

const REUSE_OPTIONS = [
  { value: "upcycling", label: "Upcycling" },
  { value: "vintage", label: "Vintage resale" },
];

const COMMUNITY_OPTIONS = [
  { value: "workshops", label: "Workshops" },
  { value: "csa", label: "Fiber CSA" },
  { value: "tours", label: "Farm / studio tours" },
  { value: "hiring", label: "Currently hiring" },
  { value: "volunteer", label: "Volunteer opportunities" },
  { value: "student_ambassador", label: "Student ambassador" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function parseTags(value: string): string[] {
  return value.split(",").map((t) => t.trim()).filter(Boolean);
}

function joinTags(tags: string[]): string {
  return tags.join(", ");
}

// ── Shared sub-components ─────────────────────────────────────────────────

function CheckboxGrid({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="checkbox-grid">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`checkbox-option${selected.includes(opt.value) ? " selected" : ""}`}
          onClick={() => onChange(toggle(selected, opt.value))}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter to add...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const tags = parseTags(value);

  function addTag() {
    const trimmed = inputVal.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange(joinTags([...tags, trimmed]));
    setInputVal("");
  }

  function removeTag(tag: string) {
    onChange(joinTags(tags.filter((t) => t !== tag)));
  }

  return (
    <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.5rem" }}>
      {tags.length > 0 && (
        <div className="tag-list">
          {tags.map((tag) => (
            <span key={tag} className="tag-item">
              {tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          className="field-input"
          style={{ marginTop: 0, flex: 1 }}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={addTag}
          style={{ whiteSpace: "nowrap", padding: "0.5rem 0.85rem" }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <p style={{
      margin: "0 0 1rem",
      fontWeight: 700,
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      color: "var(--muted)",
      borderBottom: "1px solid var(--border)",
      paddingBottom: "0.5rem",
    }}>
      {title}
    </p>
  );
}

// ── Form state ────────────────────────────────────────────────────────────

type DraftState = {
  // Basic
  full_name: string;
  business_name: string;
  short_bio: string;
  producer_types: string[];
  // Contact
  phone: string;
  website: string;
  instagram: string;
  // Location
  city: string;
  state: string;
  zip: string;
  location_privacy_level: "exact" | "city_only";
  // Privacy & consent
  consent: boolean;
  public_contact: boolean;
  // Fibers & services
  waste_wool_avail: boolean;
  animal_fibers: string[];
  fiber_animal_other: string;
  fiber_crops: string[];
  crop_other: string;
  processing_services: string[];
  dye_methods: string[];
  dye_natural_other: string;
  recycling_services: string[];
  reuse_services: string[];
  // Community
  community_offerings: string[];
  looking_for: string;
  have_available: string;
  qty_available: string;
  price_range: string;
  is_university: boolean;
  research_areas: string;
  open_to_collab: boolean;
  // Meta (not editable)
  status: string;
  profile_slug: string;
};

const emptyDraft: DraftState = {
  full_name: "", business_name: "", short_bio: "", producer_types: [],
  phone: "", website: "", instagram: "",
  city: "", state: "", zip: "", location_privacy_level: "city_only",
  consent: false, public_contact: false,
  waste_wool_avail: false,
  animal_fibers: [], fiber_animal_other: "",
  fiber_crops: [], crop_other: "",
  processing_services: [],
  dye_methods: [], dye_natural_other: "",
  recycling_services: [], reuse_services: [],
  community_offerings: [],
  looking_for: "", have_available: "", qty_available: "", price_range: "",
  is_university: false, research_areas: "", open_to_collab: false,
  status: "pending", profile_slug: "",
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  function set<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/onboarding/draft", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/join");
        return;
      }

      const json = (await response.json().catch(() => null)) as { organization?: Record<string, unknown>; rejection_reason?: string | null } | null;
      if (json?.rejection_reason) {
        setRejectionReason(json.rejection_reason);
      }
      if (json?.organization) {
        const org = json.organization;
        // producer_type from API is a comma-separated string; split back to array
        const rawType = String(org.producer_type ?? "");
        const producer_types = rawType
          ? rawType.split(", ").map((t) => t.trim()).filter(Boolean)
          : [];

        setDraft({
          ...emptyDraft,
          full_name: String(org.full_name ?? ""),
          business_name: String(org.business_name ?? ""),
          short_bio: String(org.short_bio ?? ""),
          producer_types,
          phone: String(org.phone ?? ""),
          website: String(org.website ?? ""),
          instagram: String(org.instagram ?? ""),
          city: String(org.city ?? ""),
          state: String(org.state ?? ""),
          zip: String(org.zip ?? ""),
          location_privacy_level: org.location_privacy_level === "exact" ? "exact" : "city_only",
          consent: Boolean(org.consent),
          public_contact: Boolean(org.public_contact),
          status: String(org.status ?? "pending"),
          waste_wool_avail: Boolean(org.waste_wool_avail),
          animal_fibers: Array.isArray(org.animal_fibers) ? (org.animal_fibers as string[]) : [],
          fiber_animal_other: String(org.fiber_animal_other ?? ""),
          fiber_crops: Array.isArray(org.fiber_crops) ? (org.fiber_crops as string[]) : [],
          crop_other: String(org.crop_other ?? ""),
          processing_services: Array.isArray(org.processing_services) ? (org.processing_services as string[]) : [],
          dye_methods: Array.isArray(org.dye_methods) ? (org.dye_methods as string[]) : [],
          dye_natural_other: String(org.dye_natural_other ?? ""),
          recycling_services: Array.isArray(org.recycling_services) ? (org.recycling_services as string[]) : [],
          reuse_services: Array.isArray(org.reuse_services) ? (org.reuse_services as string[]) : [],
          community_offerings: Array.isArray(org.community_offerings) ? (org.community_offerings as string[]) : [],
          looking_for: String(org.looking_for ?? ""),
          have_available: String(org.have_available ?? ""),
          qty_available: String(org.qty_available ?? ""),
          price_range: String(org.price_range ?? ""),
          is_university: Boolean(org.is_university),
          research_areas: String(org.research_areas ?? ""),
          open_to_collab: Boolean(org.open_to_collab),
          profile_slug: String(org.profile_slug ?? ""),
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function saveDraft() {
    setSaving(true);
    setNotice("");

    const payload = {
      ...draft,
      // Join producer_types array back to string for the API
      producer_type: draft.producer_types.join(", ") || "N/A",
    };

    const response = await fetch("/api/onboarding/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string; organization?: Record<string, unknown> } | null;

    setSaving(false);

    if (!response.ok) {
      setNotice(json?.error ?? "Unable to save draft.");
      return;
    }

    setNotice("Draft saved.");
  }

  async function submitForApproval() {
    setSubmitting(true);
    setNotice("");

    const response = await fetch("/api/onboarding/submit", { method: "POST" });

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
    return <main><p>Loading your profile...</p></main>;
  }

  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    pending:  { bg: "#fff3d6", color: "#6b3f00", border: "#e1c07d" },
    approved: { bg: "#def7e8", color: "#0f5132", border: "#84c6a7" },
    rejected: { bg: "#f8d7da", color: "#842029", border: "#d39ca1" },
    draft:    { bg: "var(--panel)", color: "var(--muted)", border: "var(--border)" },
  };
  const chipStyle = statusColors[draft.status] ?? statusColors.draft;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>My Profile</h1>
        <span style={{
          padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700,
          background: chipStyle.bg, color: chipStyle.color, border: `1px solid ${chipStyle.border}`,
        }}>
          {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
        </span>
      </div>
      <p className="page-lead">
        Save now, finish later. Your profile won&apos;t appear publicly until you submit and an admin approves it.
      </p>

      {draft.status === "rejected" && (
        <div
          style={{
            maxWidth: "640px",
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#7f1d1d",
          }}
        >
          <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.9rem" }}>
            Your listing needs updates before it can be approved.
          </p>
          {rejectionReason ? (
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Admin note: <em>{rejectionReason}</em>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              Please review your details and re-submit for review.
            </p>
          )}
        </div>
      )}

      {/* ── Basic info ─────────────────────────────── */}
      <div className="card" style={{ display: "grid", gap: "0.85rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Basic info" />

        <label>
          Full name <span style={{ color: "var(--brown)" }}>*</span>
          <input className="field-input" value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </label>
        <label>
          Business or project name
          <input className="field-input" value={draft.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Leave blank to use your name" />
        </label>
        <label>
          Short bio <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>(500 chars max)</span>
          <textarea
            rows={3}
            maxLength={500}
            value={draft.short_bio}
            onChange={(e) => set("short_bio", e.target.value)}
            className="field-input"
          />
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginTop: "0.2rem" }}>
            {500 - draft.short_bio.length} characters remaining
          </span>
        </label>

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
            Producer type <span style={{ color: "var(--brown)" }}>*</span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400, marginLeft: "0.4rem" }}>Select all that apply</span>
          </p>
          <CheckboxGrid
            options={PRODUCER_TYPES.map((t) => ({ value: t, label: t }))}
            selected={draft.producer_types}
            onChange={(v) => set("producer_types", v)}
          />
        </div>
      </div>

      {/* ── Contact & links ────────────────────────── */}
      <div className="card" style={{ display: "grid", gap: "0.85rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Contact & links" />

        <label>
          Phone <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
          <input type="tel" className="field-input" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label>
          Website <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
          <input type="url" className="field-input" value={draft.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </label>
        <label>
          Instagram <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
          <input className="field-input" value={draft.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
        </label>
      </div>

      {/* ── Location ───────────────────────────────── */}
      <div className="card" style={{ display: "grid", gap: "0.85rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Location" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
          <label>
            City <span style={{ color: "var(--brown)" }}>*</span>
            <input className="field-input" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </label>
          <label>
            State
            <input maxLength={2} placeholder="OH" className="field-input" value={draft.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </label>
          <label>
            ZIP
            <input className="field-input" value={draft.zip} onChange={(e) => set("zip", e.target.value)} />
          </label>
        </div>

        <label>
          Location privacy on map
          <select
            className="field-input"
            value={draft.location_privacy_level}
            onChange={(e) => set("location_privacy_level", e.target.value as "exact" | "city_only")}
          >
            <option value="city_only">Show city-level location only (recommended)</option>
            <option value="exact">Show exact location on map</option>
          </select>
        </label>
      </div>

      {/* ── Fibers & services ──────────────────────── */}
      <div className="card" style={{ display: "grid", gap: "1.25rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Fibers & services" />

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Animal fibers</p>
          <CheckboxGrid options={ANIMAL_FIBER_OPTIONS} selected={draft.animal_fibers} onChange={(v) => set("animal_fibers", v)} />
          <TagInput
            value={draft.fiber_animal_other}
            onChange={(v) => set("fiber_animal_other", v)}
            placeholder="Other animal? e.g. goat, bison, yak..."
          />
        </div>

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Fiber crops</p>
          <CheckboxGrid options={FIBER_CROP_OPTIONS} selected={draft.fiber_crops} onChange={(v) => set("fiber_crops", v)} />
          <TagInput
            value={draft.crop_other}
            onChange={(v) => set("crop_other", v)}
            placeholder="Other crop? e.g. bamboo, ramie..."
          />
        </div>

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Processing services</p>
          <CheckboxGrid options={PROCESSING_OPTIONS} selected={draft.processing_services} onChange={(v) => set("processing_services", v)} />
        </div>

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Dye methods</p>
          <CheckboxGrid options={DYE_OPTIONS} selected={draft.dye_methods} onChange={(v) => set("dye_methods", v)} />
          <TagInput
            value={draft.dye_natural_other}
            onChange={(v) => set("dye_natural_other", v)}
            placeholder="Specific plants or methods? e.g. madder, osage orange..."
          />
        </div>

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Recycling & reuse</p>
          <CheckboxGrid
            options={[...RECYCLING_OPTIONS, ...REUSE_OPTIONS]}
            selected={[...draft.recycling_services, ...draft.reuse_services]}
            onChange={(v) => {
              set("recycling_services", v.filter((x) => RECYCLING_OPTIONS.some((o) => o.value === x)));
              set("reuse_services", v.filter((x) => REUSE_OPTIONS.some((o) => o.value === x)));
            }}
          />
        </div>

        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.waste_wool_avail} onChange={(e) => set("waste_wool_avail", e.target.checked)} />
          <span style={{ fontWeight: 500 }}>I have waste wool available</span>
        </label>
      </div>

      {/* ── Community & availability ───────────────── */}
      <div className="card" style={{ display: "grid", gap: "1.25rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Community & availability" />

        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Community offerings</p>
          <CheckboxGrid options={COMMUNITY_OPTIONS} selected={draft.community_offerings} onChange={(v) => set("community_offerings", v)} />
        </div>

        <label>
          What are you looking for?
          <textarea rows={2} className="field-input" value={draft.looking_for} onChange={(e) => set("looking_for", e.target.value)} placeholder="e.g. a local mill to process my raw fleece" />
        </label>

        <label>
          What do you have available?
          <textarea rows={2} className="field-input" value={draft.have_available} onChange={(e) => set("have_available", e.target.value)} placeholder="e.g. raw alpaca fleece, approx 20 lbs" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
          <label>
            Quantity
            <input className="field-input" value={draft.qty_available} onChange={(e) => set("qty_available", e.target.value)} placeholder="e.g. 20 lbs" />
          </label>
          <label>
            Price range
            <input className="field-input" value={draft.price_range} onChange={(e) => set("price_range", e.target.value)} placeholder="e.g. $5–10/lb" />
          </label>
        </div>

        <div style={{ display: "grid", gap: "0.65rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.is_university} onChange={(e) => set("is_university", e.target.checked)} />
            <span style={{ fontWeight: 500 }}>University or research affiliation</span>
          </label>
          {draft.is_university && (
            <label>
              Research areas
              <input className="field-input" value={draft.research_areas} onChange={(e) => set("research_areas", e.target.value)} placeholder="e.g. textile sustainability, natural dyes" />
            </label>
          )}
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.open_to_collab} onChange={(e) => set("open_to_collab", e.target.checked)} />
            <span style={{ fontWeight: 500 }}>Open to collaboration</span>
          </label>
        </div>
      </div>

      {/* ── Privacy & consent ──────────────────────── */}
      <div className="card" style={{ display: "grid", gap: "0.65rem", maxWidth: "640px", marginBottom: "1rem" }}>
        <SectionHead title="Privacy & consent" />

        <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.public_contact} onChange={(e) => set("public_contact", e.target.checked)} style={{ marginTop: "0.15rem" }} />
          <span>
            Show my contact details (phone, website, Instagram) publicly on my profile.
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              If unchecked, visitors contact you through the platform without seeing your details.
            </span>
          </span>
        </label>

        <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: "0.15rem" }} />
          <span>
            <strong>I agree</strong> for this information to appear publicly on the Rust Belt Fibershed map.{" "}
            <span style={{ color: "var(--brown)" }}>*</span>
          </span>
        </label>
      </div>

      {/* ── Actions ────────────────────────────────── */}
      <div className="card" style={{ maxWidth: "640px", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn secondary" type="button" disabled={saving} onClick={saveDraft}>
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button className="btn" type="button" disabled={submitting} onClick={submitForApproval}>
          {submitting ? "Submitting..." : "Submit for review"}
        </button>
        {draft.status === "approved" && draft.profile_slug && (
          <Link className="btn secondary" href={`/profiles/${draft.profile_slug}`} style={{ marginLeft: "auto" }}>
            View my public profile
          </Link>
        )}
        {notice && (
          <p className={`notice${notice.toLowerCase().includes("unable") || notice.toLowerCase().includes("missing") ? " error" : ""}`} style={{ margin: 0, flex: "1 0 100%" }}>
            {notice}
          </p>
        )}
      </div>
    </main>
  );
}
