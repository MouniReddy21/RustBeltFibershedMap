export type ListingStatus = "pending" | "approved" | "rejected" | "suspended" | "archived";

export type ContactVisibility = "public" | "relay_only";

export type LocationPrivacy = "exact" | "city_only";

export type DirectoryListing = {
  id: string;
  profile_slug: string;
  business_name: string;
  short_bio: string;
  city: string;
  state: string;
  producer_type: string;
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  location_privacy_level: LocationPrivacy;
  public_contact: boolean;
  waste_wool_avail: boolean;
  is_university: boolean;
  fibers: string[];
  exchange_summary?: {
    offering_count: number;
    wanted_count: number;
  };
};

export type ExchangePostType = "offering" | "wanted";

export type ExchangePostStatus = "active" | "expired" | "renewed" | "closed";

export type ExchangePost = {
  id: string;
  organization_id: string;
  post_type: ExchangePostType;
  title: string;
  description: string | null;
  fiber_category: string | null;
  material_type: string | null;
  quantity: string | null;
  price_or_trade_terms: string | null;
  photo_urls: string[];
  posted_at: string;
  expires_at: string;
  status: ExchangePostStatus;
};
