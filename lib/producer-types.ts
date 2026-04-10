/**
 * Single source of truth for producer types.
 * Used in:
 *  - the submit form (select options)
 *  - the map filter buttons & legend
 *  - the listings API (filter match)
 *  - marker color assignment
 */

export const PRODUCER_TYPES = [
  "Farmer / fiber grower",
  "Fiber processing & mills",
  "Designer / maker",
  "Recycling & waste diversion",
  "Mending / upcycling / vintage",
  "Community resource",
] as const;

export type ProducerType = (typeof PRODUCER_TYPES)[number];

/** Color for each canonical type. Anything not in this map gets "Other" color. */
export const PRODUCER_TYPE_COLORS: Record<string, string> = {
  "Farmer / fiber grower":         "#1f8a70",
  "Fiber processing & mills":      "#2f5d9f",
  "Designer / maker":              "#7a3e9d",
  "Recycling & waste diversion":   "#c26f2c",
  "Mending / upcycling / vintage": "#8a4a1f",
  "Community resource":            "#4a7a3e",
  Other:                           "#57534e",
};

/** Legend entries shown on the map (canonical types + catch-all Other). */
export const PRODUCER_TYPE_LEGEND = [
  ...PRODUCER_TYPES.map((label) => ({ label, color: PRODUCER_TYPE_COLORS[label] })),
  { label: "Other", color: PRODUCER_TYPE_COLORS.Other },
];

/**
 * Maps legacy / inconsistent producer_type strings stored in the DB to the
 * current canonical values. Call this whenever reading producer_type from the DB.
 *
 * Why needed: early records used short labels ("Farmer", "Designer") that
 * pre-dated the canonical form labels. This keeps old and new records
 * fully compatible with filters and colors without a DB migration.
 */
const LEGACY_MAP: Record<string, string> = {
  // Old short labels → canonical
  "Farmer":                       "Farmer / fiber grower",
  "Designer":                     "Designer / maker",
  "Manufacturer":                 "Fiber processing & mills",
  // Sentinel / draft values → treat as unlabelled
  "N/A":                          "",
  "n/a":                          "",
};

export function normalizeProducerType(stored: string): string {
  return LEGACY_MAP[stored] ?? stored;
}

/**
 * Returns the hex color for any producer_type string stored in the DB.
 * For multi-type (comma-separated) values, uses the first type's color.
 */
export function getProducerTypeColor(producerType: string): string {
  const first = producerType.split(",")[0].trim();
  const normalized = normalizeProducerType(first);
  return PRODUCER_TYPE_COLORS[normalized] ?? PRODUCER_TYPE_COLORS.Other;
}

/**
 * Returns true when the stored producer_type matches the active filter value.
 * Handles comma-separated multi-type values (e.g. "Farmer / fiber grower, Designer / maker").
 * "Other" filter → matches only when none of the stored types are in the canonical list.
 */
export function producerTypeMatches(stored: string, filter: string): boolean {
  if (!filter) return true;
  const types = stored.split(",").map(t => normalizeProducerType(t.trim())).filter(Boolean);
  if (filter === "Other") {
    return types.length === 0 || types.every(t => !(PRODUCER_TYPES as readonly string[]).includes(t));
  }
  return types.some(t => t === filter);
}
