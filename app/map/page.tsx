"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { PRODUCER_TYPES, PRODUCER_TYPE_LEGEND } from "@/lib/producer-types";

type Listing = {
  id: string;
  profile_slug: string;
  business_name: string;
  short_bio: string;
  city: string;
  state: string;
  producer_type: string;
  lat: number | null;
  lng: number | null;
  location_privacy_level: "exact" | "city_only";
  waste_wool_avail: boolean;
  is_university: boolean;
  fibers: string[];
};

type Marker = {
  id: string;
  slug: string;
  title: string;
  short_bio: string;
  city: string;
  state: string;
  producer_type: string;
  marker_color: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  } | null;
};

type MappableMarker = Omit<Marker, "coordinates"> & {
  coordinates: {
    lat: number;
    lng: number;
  };
};

type ApiPayload = {
  total: number;
  listings: Listing[];
  markers: Marker[];
};

/** Filter buttons shown above the map — all canonical types + Other */
const producerTypeFilters = [...PRODUCER_TYPES, "Other"] as string[];

const fiberOptions = ["alpaca", "sheep wool", "angora", "mohair", "cashmere", "llama"];

/**
 * Maps the ?type= query param used by the home-page category cards
 * to a canonical producer_type filter value.
 */
const TYPE_PARAM_MAP: Record<string, string> = {
  animal:    "Farmer / fiber grower",
  plant:     "Farmer / fiber grower",
  mill:      "Fiber processing & mills",
  recycling: "Recycling & waste diversion",
  mending:   "Mending / upcycling / vintage",
  community: "Community resource",
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasValidCoordinates(marker: Marker): marker is MappableMarker {
  return (
    marker.coordinates !== null &&
    typeof marker.coordinates.lat === "number" &&
    Number.isFinite(marker.coordinates.lat) &&
    typeof marker.coordinates.lng === "number" &&
    Number.isFinite(marker.coordinates.lng)
  );
}

export default function MapPage() {
  const searchParams = useSearchParams();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [fiber, setFiber] = useState("");
  const [producerType, setProducerType] = useState(
    () => TYPE_PARAM_MAP[searchParams.get("type") ?? ""] ?? ""
  );
  const [wasteWoolOnly, setWasteWoolOnly] = useState(false);
  const [universityOnly, setUniversityOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    const markerStore = markerRefs.current;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.local.");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-82.8, 40.2],
      zoom: 5.4,
      maxZoom: 12,
      minZoom: 3
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      markerStore.forEach((marker) => marker.remove());
      markerStore.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (fiber) params.set("fiber", fiber);
    if (producerType) params.set("producer_type", producerType);
    if (wasteWoolOnly) params.set("waste_wool", "true");
    if (universityOnly) params.set("university", "true");

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/listings?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to load listings.");
        }

        const payload = (await response.json()) as ApiPayload;
        setListings(payload.listings ?? []);
        setMarkers(payload.markers ?? []);

        setActiveId((prev) => {
          if (!prev) return null;
          return payload.listings?.some((item) => item.id === prev) ? prev : null;
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Unable to load map listings right now.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [q, city, fiber, producerType, wasteWoolOnly, universityOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    popupRef.current?.remove();
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current.clear();

    const mappable = markers.filter(hasValidCoordinates);

    const bounds = new mapboxgl.LngLatBounds();

    mappable.forEach((markerData) => {
      const lat = markerData.coordinates.lat;
      const lng = markerData.coordinates.lng;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-pin";
      el.style.background = markerData.marker_color;
      el.setAttribute("aria-label", `Select ${markerData.title}`);
      el.onclick = () => setActiveId(markerData.id);
      el.onfocus = () => {
        setActiveId(markerData.id);
      };
      el.onmouseenter = () => {
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ offset: 16, closeButton: false, closeOnClick: false })
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="map-popup"><strong>${escapeHtml(markerData.title)}</strong><p>${escapeHtml(
              `${markerData.city}, ${markerData.state} - ${markerData.producer_type}`
            )}</p><p>${escapeHtml(markerData.short_bio)}</p></div>`
          )
          .addTo(map);
      };
      el.onmouseleave = () => {
        if (activeIdRef.current !== markerData.id) {
          popupRef.current?.remove();
        }
      };

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      markerRefs.current.set(markerData.id, marker);
      bounds.extend([lng, lat]);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 600 });
    }
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Update active styling on all pins (clears highlight when activeId is null)
    markerRefs.current.forEach((marker, markerId) => {
      const element = marker.getElement() as HTMLButtonElement;
      element.classList.toggle("map-pin-active", markerId === activeId);
    });

    if (!activeId) {
      popupRef.current?.remove();
      return;
    }

    const activeMarker = markers.find((item) => item.id === activeId);
    if (!activeMarker || !hasValidCoordinates(activeMarker)) {
      popupRef.current?.remove();
      return;
    }

    const lng = activeMarker.coordinates.lng;
    const lat = activeMarker.coordinates.lat;

    map.flyTo({ center: [lng, lat], duration: 600, zoom: Math.max(map.getZoom(), 6.4) });

    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup({ offset: 18, closeButton: false })
      .setLngLat([lng, lat])
      .setHTML(
        `<div class="map-popup"><strong>${escapeHtml(activeMarker.title)}</strong><p>${escapeHtml(
          `${activeMarker.city}, ${activeMarker.state} - ${activeMarker.producer_type}`
        )}</p><p>${escapeHtml(activeMarker.short_bio)}</p></div>`
      )
      .addTo(map);
  }, [activeId, markers]);

  const activeListing = listings.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    if (!activeListing) {
      setLiveAnnouncement("");
      return;
    }

    setLiveAnnouncement(
      `Selected ${activeListing.business_name} in ${activeListing.city}, ${activeListing.state}. Producer type ${activeListing.producer_type}.`
    );
  }, [activeListing]);

  return (
    <main>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h1>Rust Belt Fibershed Map + Directory</h1>
        <p>Browse approved listings across the Rust Belt bioregion. Select a marker or directory card to sync views.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/submit" className="btn">
            Submit a listing
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <input
            aria-label="Search listings"
            placeholder="Search keyword"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
          <input
            aria-label="City"
            placeholder="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
          <select
            aria-label="Fiber type"
            value={fiber}
            onChange={(event) => setFiber(event.target.value)}
            style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
          >
            <option value="">All fiber types</option>
            {fiberOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className="btn secondary"
            onClick={() => {
              setQ("");
              setCity("");
              setFiber("");
              setProducerType("");
              setWasteWoolOnly(false);
              setUniversityOnly(false);
            }}
          >
            Reset filters
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          {producerTypeFilters.map((type) => {
            const active = producerType === type;
            return (
              <button
                key={type}
                onClick={() => setProducerType(active ? "" : type)}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  padding: "0.4rem 0.7rem",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "white" : "inherit",
                  cursor: "pointer"
                }}
              >
                {type}
              </button>
            );
          })}
          <button
            onClick={() => setWasteWoolOnly((prev) => !prev)}
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              padding: "0.4rem 0.7rem",
              background: wasteWoolOnly ? "var(--accent)" : "transparent",
              color: wasteWoolOnly ? "white" : "inherit",
              cursor: "pointer"
            }}
          >
            Waste wool
          </button>
          <button
            onClick={() => setUniversityOnly((prev) => !prev)}
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              padding: "0.4rem 0.7rem",
              background: universityOnly ? "var(--accent)" : "transparent",
              color: universityOnly ? "white" : "inherit",
              cursor: "pointer"
            }}
          >
            University & research
          </button>
        </div>
      </div>

      <div
        className="map-shell"
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </p>

        <div className="mobile-map-toggle" role="tablist" aria-label="Map or directory view">
          <button
            role="tab"
            aria-selected={mobileView === "map"}
            className={`mobile-toggle-btn ${mobileView === "map" ? "active" : ""}`}
            onClick={() => setMobileView("map")}
          >
            Map
          </button>
          <button
            role="tab"
            aria-selected={mobileView === "list"}
            className={`mobile-toggle-btn ${mobileView === "list" ? "active" : ""}`}
            onClick={() => setMobileView("list")}
          >
            Directory
          </button>
        </div>

        <section className={`card map-pane ${mobileView === "map" ? "active" : ""}`} aria-label="Map panel">
          <h2 style={{ marginTop: 0 }}>Map</h2>
          <div className="map-legend" aria-label="Producer type color legend">
            {PRODUCER_TYPE_LEGEND.map((item) => (
              <div key={item.label} className="map-legend-item">
                <span className="map-legend-dot" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div ref={mapContainerRef} className="map-canvas" />
          {!loading && !markers.some((marker) => marker.coordinates) && (
            <p style={{ paddingTop: "0.75rem", color: "var(--muted)" }}>
              No exact coordinates available for this filter set. City-level listings remain visible in the
              directory.
            </p>
          )}
          {activeListing && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.95rem" }}>
              <strong>{activeListing.business_name}</strong>
              <p style={{ margin: "0.25rem 0", color: "var(--muted)" }}>
                {activeListing.city}, {activeListing.state} | {activeListing.producer_type}
              </p>
              <p style={{ margin: 0 }}>{activeListing.short_bio}</p>
            </div>
          )}
        </section>

        <section className={`card list-pane ${mobileView === "list" ? "active" : ""}`} aria-label="Directory panel">
          <h2 style={{ marginTop: 0 }}>Directory</h2>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            {loading ? "Loading listings..." : `${listings.length} listings found`}
          </p>
          {error && <p style={{ color: "#991b1b" }}>{error}</p>}
          <div style={{ display: "grid", gap: "0.6rem", maxHeight: "500px", overflowY: "auto" }}>
            {listings.map((listing) => {
              const selected = listing.id === activeId;
              return (
                <article
                  key={listing.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`Select ${listing.business_name}`}
                  onClick={() => setActiveId(listing.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveId(listing.id);
                    }
                  }}
                  className={`directory-card ${selected ? "directory-card-selected" : ""}`}
                >
                  <strong>{listing.business_name}</strong>
                  <p style={{ margin: "0.25rem 0", color: "var(--muted)" }}>
                    {listing.city}, {listing.state} - {listing.producer_type}
                  </p>
                  <p style={{ margin: "0.2rem 0" }}>{listing.short_bio}</p>
                  <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                    Fibers: {listing.fibers.length ? listing.fibers.join(", ") : "Not specified"}
                  </p>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                    {listing.waste_wool_avail && (
                      <span style={{ border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                        Waste wool
                      </span>
                    )}
                    {listing.is_university && (
                      <span style={{ border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                        University & research
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/profiles/${listing.profile_slug}`}
                    className="btn secondary"
                    style={{ marginTop: "0.6rem", display: "inline-block" }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    View profile
                  </Link>
                </article>
              );
            })}
            {!loading && !listings.length && <p>No listings match the current filters.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
