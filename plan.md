# Plan: Debug Test Farm Not Showing on Map

## TL;DR
The first blocker was the organization's status, but the current runtime error is separate: the map loop is passing `undefined` coordinates into Mapbox for markers whose `coordinates` are `null`. That happens when `location_privacy_level = 'city_only'`, because the filter checks `!== null` but does not reject `undefined`.

## Root Cause Analysis
1. **API Filter**: [app/api/listings/route.ts](app/api/listings/route.ts#L43) only returns `status='approved'` organizations, so approval is still required.
2. **Marker Shape**: [lib/mapbox/map-data.ts](lib/mapbox/map-data.ts#L13-L31) sets `coordinates: null` when `location_privacy_level === 'city_only'`.
3. **Broken Guard**: [app/map/page.tsx](app/map/page.tsx#L180-L220) filters with `marker.coordinates?.lat !== null && marker.coordinates?.lng !== null`; when `coordinates` is null, both expressions become `true` because `undefined !== null`.
4. **Result**: A city-only organization reaches `.setLngLat([lng, lat])` with `undefined` values, which Mapbox reports as `Invalid LngLat object: (NaN, NaN)`.

## Steps
1. **Keep the farm approved** - this is still required for the record to appear in the API.
2. **Fix the marker guard** - update the map loop so it excludes markers with missing coordinates before calling `setLngLat`.
3. **Verify with the test farm** - once the guard is corrected, confirm the approved Test Farm renders at its Cleveland coordinates.

## Verification
1. Approved organizations with real lat/lng render normally.
2. City-only organizations are skipped instead of crashing the map.
3. The Test Farm appears once both approval and coordinate handling are correct.

## Why It Was Failing After Approval
- Approval exposed the next issue instead of fixing it.
- The map layer assumes every marker in `markers` has usable coordinates, but `toMapMarkerPayload` intentionally emits `coordinates: null` for privacy-preserving listings.
- The current filter is not strict enough to exclude those records.

## Further Considerations
1. **Data hygiene**: If you want to test only map pins, use organizations with `location_privacy_level = 'exact'` and populated `lat/lng`.
2. **Privacy behavior**: If city-only listings should still appear on the map, they need a different rendering strategy, such as centering on the city rather than plotting exact coordinates.

Add a Toggle in the Profile Submission Form

Add a toggle or dropdown to the profile submission form where users can select between "Show exact location on map" or "Show city-level location only."
Update the form to send the selected value (exact or city_only) to the backend.
Update the Backend API

Ensure the backend API that handles profile submissions or updates accepts the location_privacy_level field and saves it to the database.
Update the Map Behavior

If you want city-only listings to appear on the map with a generic marker (e.g., centered on the city), update the map logic to handle city_only listings differently. For example, you could use the city center coordinates instead of hiding the marker.