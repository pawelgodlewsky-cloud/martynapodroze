PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  country TEXT NOT NULL,
  country_emoji TEXT NOT NULL DEFAULT '',
  departure_city TEXT NOT NULL,
  departure_airport TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_price REAL NOT NULL CHECK (total_price >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  personal_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'disabled')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_links (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'lodging', 'transfer', 'parking', 'attraction', 'car', 'train', 'bus', 'other')),
  label TEXT NOT NULL,
  description TEXT,
  price REAL CHECK (price IS NULL OR price >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  from_location TEXT,
  to_location TEXT,
  provider TEXT,
  nights INTEGER CHECK (nights IS NULL OR nights >= 0)
);

CREATE TABLE IF NOT EXISTS trip_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  link_id TEXT REFERENCES trip_links(id) ON DELETE SET NULL,
  link_type TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  visitor_id TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_status_slug ON trips(status, slug);
CREATE INDEX IF NOT EXISTS idx_trip_links_trip_sort ON trip_links(trip_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip_type ON trip_events(trip_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_trip_events_link_type ON trip_events(link_id, event_type, created_at);
