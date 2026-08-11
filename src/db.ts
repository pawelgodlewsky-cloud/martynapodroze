import type {
  Env,
  TripInput,
  TripLinkInput,
  TripLinkRow,
  TripListRow,
  TripRow,
  TripWithLinks
} from "./types";

function tripValues(id: string, trip: TripInput): unknown[] {
  return [
    id,
    trip.slug,
    trip.destination,
    trip.country,
    trip.country_emoji,
    trip.departure_city,
    trip.departure_airport,
    trip.start_date,
    trip.end_date,
    trip.total_price,
    trip.currency,
    trip.personal_note,
    trip.status,
    trip.expires_at
  ];
}

function linkInsert(db: D1Database, tripId: string, link: TripLinkInput, id: string = crypto.randomUUID()): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO trip_links (
      id, trip_id, type, label, description, price, currency, url, sort_order,
      from_location, to_location, provider, nights
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    tripId,
    link.type,
    link.label,
    link.description,
    link.price,
    link.currency,
    link.url,
    link.sort_order,
    link.from_location,
    link.to_location,
    link.provider,
    link.nights
  );
}

export async function listTrips(env: Env): Promise<TripListRow[]> {
  const result = await env.DB.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.id END) AS views,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' AND e.link_type = 'flight' THEN e.id END) AS flight_clicks,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' AND e.link_type = 'lodging' THEN e.id END) AS lodging_clicks,
      COUNT(DISTINCT CASE WHEN e.event_type = 'click' THEN e.id END) AS clicks
    FROM trips t
    LEFT JOIN trip_events e ON e.trip_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all<Omit<TripListRow, "ctr">>();

  return (result.results ?? []).map((trip) => {
    const views = Number(trip.views ?? 0);
    const clicks = Number(trip.clicks ?? 0);
    return {
      ...trip,
      views,
      clicks,
      flight_clicks: Number(trip.flight_clicks ?? 0),
      lodging_clicks: Number(trip.lodging_clicks ?? 0),
      ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0
    };
  });
}

export async function getTrip(env: Env, id: string): Promise<TripWithLinks | null> {
  const trip = await env.DB.prepare("SELECT * FROM trips WHERE id = ?").bind(id).first<TripRow>();
  if (!trip) return null;
  const links = await env.DB.prepare("SELECT * FROM trip_links WHERE trip_id = ? ORDER BY sort_order, id")
    .bind(id)
    .all<TripLinkRow>();
  return { ...trip, links: links.results ?? [] };
}

export async function getPublicTripBySlug(env: Env, slug: string): Promise<TripWithLinks | null> {
  const trip = await env.DB.prepare(`
    SELECT * FROM trips
    WHERE slug = ?
      AND status = 'active'
      AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
  `).bind(slug).first<TripRow>();
  if (!trip) return null;
  const links = await env.DB.prepare("SELECT * FROM trip_links WHERE trip_id = ? ORDER BY sort_order, id")
    .bind(trip.id)
    .all<TripLinkRow>();
  return { ...trip, links: links.results ?? [] };
}

export async function createTrip(env: Env, trip: TripInput): Promise<TripWithLinks> {
  const id = crypto.randomUUID();
  const insertTrip = env.DB.prepare(`
    INSERT INTO trips (
      id, slug, destination, country, country_emoji, departure_city, departure_airport,
      start_date, end_date, total_price, currency, personal_note, status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(...tripValues(id, trip));
  await env.DB.batch([insertTrip, ...trip.links.map((link) => linkInsert(env.DB, id, link))]);
  const created = await getTrip(env, id);
  if (!created) throw new Error("Nie udało się odczytać utworzonej propozycji.");
  return created;
}

export async function updateTrip(env: Env, id: string, trip: TripInput): Promise<TripWithLinks | null> {
  const exists = await env.DB.prepare("SELECT id FROM trips WHERE id = ?").bind(id).first<{ id: string }>();
  if (!exists) return null;

  const update = env.DB.prepare(`
    UPDATE trips SET
      slug = ?, destination = ?, country = ?, country_emoji = ?, departure_city = ?,
      departure_airport = ?, start_date = ?, end_date = ?, total_price = ?, currency = ?,
      personal_note = ?, status = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    trip.slug,
    trip.destination,
    trip.country,
    trip.country_emoji,
    trip.departure_city,
    trip.departure_airport,
    trip.start_date,
    trip.end_date,
    trip.total_price,
    trip.currency,
    trip.personal_note,
    trip.status,
    trip.expires_at,
    id
  );
  const removeLinks = env.DB.prepare("DELETE FROM trip_links WHERE trip_id = ?").bind(id);
  const seen = new Set<string>();
  const inserts = trip.links.map((link) => {
    const requestedId = link.id && !seen.has(link.id) ? link.id : crypto.randomUUID();
    seen.add(requestedId);
    return linkInsert(env.DB, id, link, requestedId);
  });
  await env.DB.batch([update, removeLinks, ...inserts]);
  return getTrip(env, id);
}

export async function deleteTrip(env: Env, id: string): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM trips WHERE id = ?").bind(id).run();
  return Boolean(result.meta.changes);
}

async function uniqueSlug(env: Env, base: string): Promise<string> {
  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? `${base}-kopia` : `${base}-kopia-${suffix}`;
    const exists = await env.DB.prepare("SELECT 1 AS found FROM trips WHERE slug = ?").bind(candidate).first();
    if (!exists) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function duplicateTrip(env: Env, id: string): Promise<TripWithLinks | null> {
  const source = await getTrip(env, id);
  if (!source) return null;
  const slug = await uniqueSlug(env, source.slug);
  return createTrip(env, {
    slug,
    destination: source.destination,
    country: source.country,
    country_emoji: source.country_emoji,
    departure_city: source.departure_city,
    departure_airport: source.departure_airport,
    start_date: source.start_date,
    end_date: source.end_date,
    total_price: source.total_price,
    currency: source.currency,
    personal_note: source.personal_note,
    status: "draft",
    expires_at: source.expires_at,
    links: source.links.map((link) => ({
      type: link.type,
      label: link.label,
      description: link.description,
      price: link.price,
      currency: link.currency,
      url: link.url,
      sort_order: link.sort_order,
      from_location: link.from_location,
      to_location: link.to_location,
      provider: link.provider,
      nights: link.nights
    }))
  });
}

export async function getPublicLink(env: Env, id: string): Promise<(TripLinkRow & { trip_status: string; expires_at: string | null }) | null> {
  return env.DB.prepare(`
    SELECT l.*, t.status AS trip_status, t.expires_at
    FROM trip_links l
    JOIN trips t ON t.id = l.trip_id
    WHERE l.id = ?
      AND t.status = 'active'
      AND (t.expires_at IS NULL OR datetime(t.expires_at) > CURRENT_TIMESTAMP)
  `).bind(id).first<TripLinkRow & { trip_status: string; expires_at: string | null }>();
}
