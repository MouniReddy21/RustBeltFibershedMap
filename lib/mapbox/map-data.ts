import type { DirectoryListing } from "@/lib/types";

const markerColors: Record<string, string> = {
  Farmer: "#1f8a70",
  "Fiber processing & mills": "#2f5d9f",
  Manufacturer: "#9f4a2f",
  Designer: "#7a3e9d",
  default: "#57534e"
};

export function getMarkerColor(producerType: string): string {
  return markerColors[producerType] ?? markerColors.default;
}

function cityKey(city: string, state: string): string {
  return `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
}

export function toMapMarkerPayload(listings: DirectoryListing[]) {
  const cityCenters = new Map<string, { latTotal: number; lngTotal: number; count: number }>();

  for (const listing of listings) {
    if (listing.lat === null || listing.lng === null) continue;

    const key = cityKey(listing.city, listing.state);
    const current = cityCenters.get(key) ?? { latTotal: 0, lngTotal: 0, count: 0 };

    current.latTotal += listing.lat;
    current.lngTotal += listing.lng;
    current.count += 1;
    cityCenters.set(key, current);
  }

  return listings
    .map((listing) => {
      if (listing.location_privacy_level === "city_only") {
        const key = cityKey(listing.city, listing.state);
        const center = cityCenters.get(key);

        if (!center || center.count === 0) {
          return null;
        }

        return {
          id: listing.id,
          slug: listing.profile_slug,
          title: listing.business_name,
          short_bio: listing.short_bio,
          city: listing.city,
          state: listing.state,
          producer_type: listing.producer_type,
          marker_color: getMarkerColor(listing.producer_type),
          coordinates: {
            lat: center.latTotal / center.count,
            lng: center.lngTotal / center.count
          }
        };
      }

      if (listing.lat === null || listing.lng === null) {
        return null;
      }

      return {
        id: listing.id,
        slug: listing.profile_slug,
        title: listing.business_name,
        short_bio: listing.short_bio,
        city: listing.city,
        state: listing.state,
        producer_type: listing.producer_type,
        marker_color: getMarkerColor(listing.producer_type),
        coordinates: {
          lat: listing.lat,
          lng: listing.lng
        }
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null)
    ;
}
