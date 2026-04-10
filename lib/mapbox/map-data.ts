import type { DirectoryListing } from "@/lib/types";
import { getProducerTypeColor, normalizeProducerType } from "@/lib/producer-types";

/**
 * Converts approved listings into map marker payloads.
 *
 * Coordinate strategy:
 * - city_only: lat/lng is the geocoded city centroid (set at approval time).
 *   The exact address is never exposed.
 * - exact: lat/lng is the precise geocoded address.
 *
 * Listings with no coordinates (lat/lng both null) are excluded from the map.
 * This should only happen for very old records — new approvals are always geocoded.
 */
export function toMapMarkerPayload(listings: DirectoryListing[]) {
  return listings
    .map((listing) => {
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
        producer_type: normalizeProducerType(listing.producer_type),
        marker_color: getProducerTypeColor(normalizeProducerType(listing.producer_type)),
        coordinates: {
          lat: listing.lat,
          lng: listing.lng
        }
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
}
