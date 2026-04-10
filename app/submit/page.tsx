"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PRODUCER_TYPES } from "@/lib/producer-types";

// ─── Mapbox geocoding helpers (client-side, uses NEXT_PUBLIC token) ────────
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  if (!MAPBOX_TOKEN || zip.length !== 5 || !/^\d{5}$/.test(zip)) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${zip}.json?country=US&types=postcode&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { features?: Array<{ context?: Array<{ id: string; text: string; short_code?: string }> }> };
    const ctx = json.features?.[0]?.context ?? [];
    const city = ctx.find(c => c.id.startsWith("place"))?.text ?? "";
    const regionCode = ctx.find(c => c.id.startsWith("region"))?.short_code ?? "";
    const state = regionCode.replace("US-", "");
    if (!city || !state) return null;
    return { city, state };
  } catch {
    return null;
  }
}

async function suggestStates(query: string): Promise<{ name: string; abbr: string }[]> {
  if (!MAPBOX_TOKEN || query.length < 1) return [];
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=US&types=region&limit=6&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: Array<{ text: string; properties?: { short_code?: string } }> };
    return (json.features ?? [])
      .map(f => ({ name: f.text, abbr: (f.properties?.short_code ?? "").replace("US-", "") }))
      .filter(s => s.abbr.length === 2);
  } catch {
    return [];
  }
}

async function suggestCities(query: string, state: string): Promise<string[]> {
  if (!MAPBOX_TOKEN || query.length < 2) return [];
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=US&types=place&limit=10&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: Array<{ text: string; context?: Array<{ id: string; short_code?: string }> }> };
    const features = json.features ?? [];
    // Filter by state if a 2-letter abbreviation is set
    if (state && state.length === 2) {
      const stateCode = `US-${state.toUpperCase()}`;
      return features
        .filter(f => f.context?.some(c => c.id.startsWith("region") && c.short_code === stateCode))
        .map(f => f.text);
    }
    return features.map(f => f.text);
  } catch {
    return [];
  }
}

// ─── Step labels ──────────────────────────────────────────────────────────
const STEPS = ["About you", "Your work", "Location", "Community", "Consent"];

const ANIMAL_FIBER_OPTIONS = [
  { value: "alpaca", label: "Alpaca" },
  { value: "sheep_wool", label: "Sheep wool" },
  { value: "angora", label: "Angora" },
  { value: "mohair", label: "Mohair" },
  { value: "cashmere", label: "Cashmere" },
  { value: "llama", label: "Llama" }
];

const FIBER_CROP_OPTIONS = [
  { value: "cotton", label: "Cotton" },
  { value: "flax_linen", label: "Flax / linen" },
  { value: "hemp", label: "Hemp" },
  { value: "nettle", label: "Nettle" }
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
  { value: "cut_sew", label: "Cut & sew" }
];

const DYE_OPTIONS = [
  { value: "garden", label: "Garden / natural dyes" },
  { value: "indigo", label: "Indigo" },
  { value: "woad", label: "Woad" },
  { value: "algae_ink", label: "Algae ink" },
  { value: "synthetic", label: "Synthetic dyes" }
];

const RECYCLING_OPTIONS = [
  { value: "fiber", label: "Fiber recycling" },
  { value: "fabric", label: "Fabric recycling" },
  { value: "metal", label: "Metal recycling" },
  { value: "accepts_waste", label: "Accepts waste fiber" },
  { value: "shredding", label: "Shredding / grinding" }
];

const REUSE_OPTIONS = [
  { value: "upcycling", label: "Upcycling" },
  { value: "vintage", label: "Vintage resale" }
];

const COMMUNITY_OPTIONS = [
  { value: "workshops", label: "Workshops" },
  { value: "csa", label: "Fiber CSA" },
  { value: "tours", label: "Farm / studio tours" },
  { value: "hiring", label: "Currently hiring" },
  { value: "volunteer", label: "Volunteer opportunities" },
  { value: "student_ambassador", label: "Student ambassador" }
];

// ─── Form state ───────────────────────────────────────────────────────────
type FormState = {
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  producer_types: string[];
  producer_type_other: string;
  short_bio: string;
  animal_fibers: string[];
  fiber_animal_other: string;       // comma-separated custom animals
  fiber_crops: string[];
  crop_other: string;               // comma-separated custom crops
  processing_services: string[];
  processing_other: string;         // comma-separated custom processing
  dye_methods: string[];
  dye_natural_other: string;        // comma-separated custom dyes
  recycling_services: string[];
  reuse_services: string[];
  recycling_other: string;          // comma-separated custom recycling
  waste_wool_avail: boolean;
  city: string;
  state: string;
  zip: string;
  location_privacy_level: "exact" | "city_only";
  community_offerings: string[];
  looking_for: string;
  have_available: string;
  qty_available: string;
  price_range: string;
  is_university: boolean;
  research_areas: string;
  open_to_collab: boolean;
  consent: boolean;
  public_contact: boolean;
};

const EMPTY: FormState = {
  full_name: "", business_name: "", email: "", phone: "", website: "", instagram: "",
  producer_types: [], producer_type_other: "", short_bio: "",
  animal_fibers: [], fiber_animal_other: "",
  fiber_crops: [], crop_other: "",
  processing_services: [], processing_other: "",
  dye_methods: [], dye_natural_other: "",
  recycling_services: [], reuse_services: [], recycling_other: "",
  waste_wool_avail: false,
  city: "", state: "", zip: "", location_privacy_level: "city_only",
  community_offerings: [], looking_for: "", have_available: "",
  qty_available: "", price_range: "",
  is_university: false, research_areas: "", open_to_collab: false,
  consent: false, public_contact: false
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

function parseTags(value: string): string[] {
  return value.split(",").map(t => t.trim()).filter(Boolean);
}

function joinTags(tags: string[]): string {
  return tags.join(", ");
}

// ─── TagInput ─────────────────────────────────────────────────────────────
// Lets users type and add custom items not in the preset list.
// Stores as comma-separated string that maps to _other DB fields.
function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter to add..."
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const tags = parseTags(value);

  function addTag() {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange(joinTags([...tags, trimmed]));
    }
    setInputVal("");
  }

  function removeTag(tag: string) {
    onChange(joinTags(tags.filter(t => t !== tag)));
  }

  return (
    <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.5rem" }}>
      {tags.length > 0 && (
        <div className="tag-list">
          {tags.map(tag => (
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
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
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

// ─── CheckboxGrid ─────────────────────────────────────────────────────────
function CheckboxGrid({
  options,
  selected,
  onChange
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="checkbox-grid">
      {options.map(opt => (
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

function Opt() {
  return <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}> (optional)</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function SubmitPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isOtherType, setIsOtherType] = useState(false);

  // Location helpers
  const [zipLookupMsg, setZipLookupMsg] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [stateSuggestions, setStateSuggestions] = useState<{ name: string; abbr: string }[]>([]);
  const [stateOpen, setStateOpen] = useState(false);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Auto-detect city+state when a 5-digit zip is entered
  useEffect(() => {
    if (!/^\d{5}$/.test(form.zip)) {
      setZipLookupMsg(null);
      return;
    }
    setZipLookupMsg("Looking up zip code...");
    lookupZip(form.zip).then(result => {
      if (!result) {
        setZipLookupMsg("Zip code not found — please enter city manually.");
        return;
      }
      setForm(prev => ({
        ...prev,
        city: prev.city || result.city,
        state: prev.state || result.state
      }));
      setZipLookupMsg(`Detected: ${result.city}, ${result.state}`);
    });
  }, [form.zip]);

  // State suggestions as user types
  useEffect(() => {
    if (stateDebounceRef.current) clearTimeout(stateDebounceRef.current);
    if (form.state.length < 1) { setStateSuggestions([]); setStateOpen(false); return; }
    stateDebounceRef.current = setTimeout(async () => {
      const results = await suggestStates(form.state);
      setStateSuggestions(results);
      setStateOpen(results.length > 0);
    }, 250);
  }, [form.state]);

  // City suggestions as user types (filtered by state when set)
  useEffect(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (form.city.length < 2) { setCitySuggestions([]); setCityOpen(false); return; }
    cityDebounceRef.current = setTimeout(async () => {
      const suggestions = await suggestCities(form.city, form.state);
      setCitySuggestions(suggestions);
      setCityOpen(suggestions.length > 0);
    }, 350);
  }, [form.city, form.state]);

  function validateStep(): string {
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required.";
      if (!form.email.trim() || !form.email.includes("@")) return "A valid email address is required.";
    }
    if (step === 2) {
      if (form.producer_types.length === 0 && !(isOtherType && form.producer_type_other.trim())) return "Please select at least one producer type.";
    }
    if (step === 3) {
      if (!form.city.trim()) return "City is required.";
      // state and zip are optional — city alone is enough to place on the map
    }
    if (step === 5) {
      if (!form.consent) return "You must agree to appear on the public map to submit.";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError("");
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/submit/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/submit/confirm");
  }

  return (
    <main>
      <h1 style={{ marginBottom: "0.4rem" }}>Join the Rust Belt Fibershed Map</h1>
      <p className="page-lead">
        Your listing will be reviewed before it appears publicly. No account needed.
      </p>

      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone = step > num;
          const isActive = step === num;
          return (
            <div key={label} className="step-indicator-item">
              <div className={`step-dot${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
                {isDone ? "✓" : num}
              </div>
              <span className="step-label">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ maxWidth: "600px", marginTop: "1.5rem" }}>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>
          Step {step} of {STEPS.length} — {STEPS[step - 1]}
        </p>

        {/* ── Step 1: About you ── */}
        {step === 1 && (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <label>
              Full name <span style={{ color: "var(--brown)" }}>*</span>
              <input className="field-input" value={form.full_name} onChange={e => set("full_name", e.target.value)} autoFocus />
            </label>
            <label>
              Business or project name<Opt />
              <input className="field-input" value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Leave blank to use your name" />
            </label>
            <label>
              Email <span style={{ color: "var(--brown)" }}>*</span>
              <input type="email" className="field-input" value={form.email} onChange={e => set("email", e.target.value)} />
            </label>
            <label>
              Phone<Opt />
              <input type="tel" className="field-input" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </label>
            <label>
              Website<Opt />
              <input type="url" className="field-input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
            </label>
            <label>
              Instagram<Opt />
              <input className="field-input" value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@handle" />
            </label>
          </div>
        )}

        {/* ── Step 2: Your work ── */}
        {step === 2 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
                Producer type <span style={{ color: "var(--brown)" }}>*</span>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400, marginLeft: "0.4rem" }}>Select all that apply</span>
              </p>
              <CheckboxGrid
                options={PRODUCER_TYPES.map(t => ({ value: t, label: t }))}
                selected={form.producer_types}
                onChange={v => set("producer_types", v)}
              />
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isOtherType}
                  onChange={e => {
                    setIsOtherType(e.target.checked);
                    if (!e.target.checked) set("producer_type_other", "");
                  }}
                />
                <span style={{ fontWeight: 500 }}>Other — describe below</span>
              </label>
              {isOtherType && (
                <label style={{ marginTop: "0.5rem", display: "block" }}>
                  Describe your work <span style={{ color: "var(--brown)" }}>*</span>
                  <input
                    className="field-input"
                    placeholder="e.g. Yarn shop, natural dye studio..."
                    value={form.producer_type_other}
                    onChange={e => set("producer_type_other", e.target.value)}
                    autoFocus
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem", display: "block" }}>
                    Your listing will appear on the map under &ldquo;Other&rdquo; with a grey marker.
                  </span>
                </label>
              )}
            </div>

            <label>
              Short bio<Opt />
              <textarea
                rows={3}
                maxLength={500}
                className="field-input"
                value={form.short_bio}
                onChange={e => set("short_bio", e.target.value)}
                placeholder="A few words about what you do..."
              />
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginTop: "0.2rem" }}>
                {500 - form.short_bio.length} characters remaining
              </span>
            </label>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Animal fibers<Opt /></p>
              <CheckboxGrid options={ANIMAL_FIBER_OPTIONS} selected={form.animal_fibers} onChange={v => set("animal_fibers", v)} />
              <TagInput
                value={form.fiber_animal_other}
                onChange={v => set("fiber_animal_other", v)}
                placeholder="Don't see your animal? e.g. goat, bison, yak..."
              />
            </div>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Fiber crops<Opt /></p>
              <CheckboxGrid options={FIBER_CROP_OPTIONS} selected={form.fiber_crops} onChange={v => set("fiber_crops", v)} />
              <TagInput
                value={form.crop_other}
                onChange={v => set("crop_other", v)}
                placeholder="Other crop? e.g. bamboo, ramie, stinging nettle..."
              />
            </div>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Processing services<Opt /></p>
              <CheckboxGrid options={PROCESSING_OPTIONS} selected={form.processing_services} onChange={v => set("processing_services", v)} />
              <TagInput
                value={form.processing_other}
                onChange={v => set("processing_other", v)}
                placeholder="Other service not listed? e.g. scouring, combing..."
              />
            </div>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Dye methods<Opt /></p>
              <CheckboxGrid options={DYE_OPTIONS} selected={form.dye_methods} onChange={v => set("dye_methods", v)} />
              <TagInput
                value={form.dye_natural_other}
                onChange={v => set("dye_natural_other", v)}
                placeholder="Specific plants or methods? e.g. madder, osage orange..."
              />
            </div>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Recycling & reuse<Opt /></p>
              <CheckboxGrid
                options={[...RECYCLING_OPTIONS, ...REUSE_OPTIONS]}
                selected={[...form.recycling_services, ...form.reuse_services]}
                onChange={v => {
                  set("recycling_services", v.filter(x => RECYCLING_OPTIONS.some(o => o.value === x)));
                  set("reuse_services", v.filter(x => REUSE_OPTIONS.some(o => o.value === x)));
                }}
              />
              <TagInput
                value={form.recycling_other}
                onChange={v => set("recycling_other", v)}
                placeholder="Other recycling or reuse service..."
              />
            </div>

            <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={form.waste_wool_avail} onChange={e => set("waste_wool_avail", e.target.checked)} />
              <span style={{ fontWeight: 500 }}>I have waste wool available</span>
            </label>
          </div>
        )}

        {/* ── Step 3: Location ── */}
        {step === 3 && (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <div className="notice" style={{ background: "#fdf8ec", borderColor: "#e0c060", color: "#5a3e00" }}>
              Approximate location is fine — city is enough to appear on the map. State and ZIP are optional.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <label>
                ZIP<Opt />
                <input
                  className="field-input"
                  value={form.zip}
                  onChange={e => set("zip", e.target.value)}
                  placeholder="Enter ZIP to auto-fill city"
                  inputMode="numeric"
                  maxLength={5}
                />
                {zipLookupMsg && (
                  <span style={{ fontSize: "0.8rem", color: zipLookupMsg.startsWith("Detected") ? "var(--accent-strong)" : "var(--muted)", marginTop: "0.2rem", display: "block" }}>
                    {zipLookupMsg}
                  </span>
                )}
              </label>
              <label style={{ position: "relative" }}>
                State<Opt />
                <div className="autocomplete-wrap">
                  <input
                    className="field-input"
                    placeholder="e.g. Ohio or OH"
                    value={form.state}
                    onChange={e => {
                      set("state", e.target.value);
                      setStateOpen(false);
                    }}
                    onFocus={() => { if (stateSuggestions.length > 0) setStateOpen(true); }}
                    onBlur={() => setTimeout(() => setStateOpen(false), 150)}
                    autoComplete="off"
                  />
                  {stateOpen && stateSuggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {stateSuggestions.map(s => (
                        <div
                          key={s.abbr}
                          className="autocomplete-option"
                          onMouseDown={() => {
                            set("state", s.abbr);
                            setStateSuggestions([]);
                            setStateOpen(false);
                          }}
                        >
                          {s.name} <span style={{ color: "var(--muted)", fontSize: "0.85em" }}>({s.abbr})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>

            <label>
              City <span style={{ color: "var(--brown)" }}>*</span>
              <div className="autocomplete-wrap">
                <input
                  className="field-input"
                  value={form.city}
                  onChange={e => {
                    set("city", e.target.value);
                    setCityOpen(false);
                  }}
                  onFocus={() => { if (citySuggestions.length > 0) setCityOpen(true); }}
                  onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                  placeholder="e.g. Cleveland"
                  autoComplete="off"
                />
                {cityOpen && citySuggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {citySuggestions.map(c => (
                      <div
                        key={c}
                        className="autocomplete-option"
                        onMouseDown={() => {
                          set("city", c);
                          setCitySuggestions([]);
                          setCityOpen(false);
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label>
              Location privacy on public map
              <select
                className="field-input"
                value={form.location_privacy_level}
                onChange={e => set("location_privacy_level", e.target.value as "exact" | "city_only")}
              >
                <option value="city_only">Show city-level location only (recommended)</option>
                <option value="exact">Show my exact location on the map</option>
              </select>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem", display: "block" }}>
                You can change this after your profile is approved.
              </span>
            </label>
          </div>
        )}

        {/* ── Step 4: Community & availability ── */}
        {step === 4 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Community offerings<Opt /></p>
              <CheckboxGrid options={COMMUNITY_OPTIONS} selected={form.community_offerings} onChange={v => set("community_offerings", v)} />
            </div>

            <label>
              What are you looking for?<Opt />
              <textarea rows={2} className="field-input" value={form.looking_for} onChange={e => set("looking_for", e.target.value)} placeholder="e.g. a local mill to process my raw fleece" />
            </label>

            <label>
              What do you have available?<Opt />
              <textarea rows={2} className="field-input" value={form.have_available} onChange={e => set("have_available", e.target.value)} placeholder="e.g. raw alpaca fleece, approx 20 lbs" />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <label>
                Quantity<Opt />
                <input className="field-input" value={form.qty_available} onChange={e => set("qty_available", e.target.value)} placeholder="e.g. 20 lbs" />
              </label>
              <label>
                Price range<Opt />
                <input className="field-input" value={form.price_range} onChange={e => set("price_range", e.target.value)} placeholder="e.g. $5–10/lb" />
              </label>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "grid", gap: "0.65rem" }}>
              <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_university} onChange={e => set("is_university", e.target.checked)} />
                <span style={{ fontWeight: 500 }}>University or research affiliation</span>
              </label>
              {form.is_university && (
                <label>
                  Research areas
                  <input className="field-input" value={form.research_areas} onChange={e => set("research_areas", e.target.value)} placeholder="e.g. textile sustainability, natural dyes" autoFocus />
                </label>
              )}
              <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={form.open_to_collab} onChange={e => set("open_to_collab", e.target.checked)} />
                <span style={{ fontWeight: 500 }}>Open to collaboration</span>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 5: Consent ── */}
        {step === 5 && (
          <div style={{ display: "grid", gap: "1.1rem" }}>
            <p style={{ margin: 0, lineHeight: 1.65, color: "var(--muted)" }}>
              Almost done. Your listing will be reviewed before it appears publicly on the map.
            </p>

            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.9rem" }}>
              <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                Review your details
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.7 }}>
                <strong>{form.full_name}</strong>
                {form.business_name && form.business_name !== form.full_name ? ` · ${form.business_name}` : ""}<br />
                {form.email}<br />
                {[form.city, form.state, form.zip].filter(Boolean).join(", ") || "Location not set"}<br />
                {[...form.producer_types, ...(isOtherType && form.producer_type_other ? [form.producer_type_other] : [])].join(", ") || "Producer type not set"}
              </p>
            </div>

            <label style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={form.consent} onChange={e => set("consent", e.target.checked)} style={{ marginTop: "0.2rem", flexShrink: 0 }} />
              <span style={{ lineHeight: 1.6 }}>
                <strong>I agree</strong> for this information to appear publicly on the Rust Belt Fibershed map.{" "}
                <span style={{ color: "var(--brown)" }}>*</span>
              </span>
            </label>

            <label style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={form.public_contact} onChange={e => set("public_contact", e.target.checked)} style={{ marginTop: "0.2rem", flexShrink: 0 }} />
              <span style={{ lineHeight: 1.6 }}>
                Show my contact details (email, phone, website) publicly on my profile.
                <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  If unchecked, visitors can contact you through the platform without seeing your details directly.
                </span>
              </span>
            </label>
          </div>
        )}

        {error && <p className="notice error" style={{ marginTop: "1rem" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          {step > 1 ? (
            <button className="btn secondary" type="button" onClick={back}>Back</button>
          ) : <span />}
          {step < STEPS.length ? (
            <button className="btn" type="button" onClick={next}>Continue →</button>
          ) : (
            <button className="btn" type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit listing"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
