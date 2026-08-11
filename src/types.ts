export const TRIP_STATUSES = ["draft", "active", "expired", "disabled"] as const;
export const LINK_TYPES = [
  "flight",
  "lodging",
  "transfer",
  "parking",
  "attraction",
  "car",
  "train",
  "bus",
  "other"
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];
export type LinkType = (typeof LINK_TYPES)[number];

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  VISITOR_SALT?: string;
  MAILERLITE_API_TOKEN?: string;
  MAILERLITE_GROUP_ID?: string;
  ALLOW_LOCAL_ADMIN?: string;
}

export interface TripLinkInput {
  id?: string;
  type: LinkType;
  label: string;
  description: string | null;
  price: number | null;
  currency: string;
  url: string;
  sort_order: number;
  from_location: string | null;
  to_location: string | null;
  provider: string | null;
  nights: number | null;
}

export interface TripInput {
  slug: string;
  destination: string;
  country: string;
  country_emoji: string;
  departure_city: string;
  departure_airport: string;
  start_date: string;
  end_date: string;
  total_price: number;
  currency: string;
  personal_note: string | null;
  status: TripStatus;
  expires_at: string | null;
  links: TripLinkInput[];
}

export interface TripRow {
  id: string;
  slug: string;
  destination: string;
  country: string;
  country_emoji: string;
  departure_city: string;
  departure_airport: string;
  start_date: string;
  end_date: string;
  total_price: number;
  currency: string;
  personal_note: string | null;
  status: TripStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripLinkRow extends Omit<TripLinkInput, "id"> {
  id: string;
  trip_id: string;
}

export interface TripWithLinks extends TripRow {
  links: TripLinkRow[];
}

export interface TripListRow extends TripRow {
  views: number;
  flight_clicks: number;
  lodging_clicks: number;
  clicks: number;
  ctr: number;
}
