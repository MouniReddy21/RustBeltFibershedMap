/**
 * Geocodes a city + state string using Mapbox Geocoding v5.
 * Returns { lat, lng } of the city centroid, or null if the request fails.
 *
 * Used at approval time so every approved org has valid coordinates.
 * - city_only privacy → we geocode "city, state" → city centroid stored
 * - exact privacy (future) → geocode full address → precise coords stored
 */
export async function geocodeCity(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const query = encodeURIComponent(`${city}, ${state}, United States`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=US&types=place,locality,district&limit=1&access_token=${token}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };

    const center = json.features?.[0]?.center;
    if (!center) return null;

    // Mapbox returns [lng, lat]
    return { lat: center[1], lng: center[0] };
  } catch {
    return null;
  }
}
