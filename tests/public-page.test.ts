import { describe, expect, it } from "vitest";
import { renderPublicTrip } from "../src/public-page";
import type { TripWithLinks } from "../src/types";

const trip: TripWithLinks = {
  id: "trip-1",
  slug: "mediolan-19-21-wrzesnia",
  destination: "Mediolan",
  country: "Włochy",
  country_emoji: "🇮🇹",
  departure_city: "Warszawa",
  departure_airport: "WAW",
  start_date: "2026-09-19",
  end_date: "2026-09-21",
  total_price: 999,
  currency: "PLN",
  personal_note: null,
  status: "active",
  expires_at: null,
  created_at: "2026-08-11T00:00:00.000Z",
  updated_at: "2026-08-11T00:00:00.000Z",
  links: []
};

describe("public trip newsletter", () => {
  it("renders the MailerLite signup on every generated trip page", () => {
    const html = renderPublicTrip(trip, "https://martynapodroze.pl/w/mediolan-19-21-wrzesnia");

    expect(html).toContain('id="trip-newsletter-form"');
    expect(html).toContain('name="consent" type="checkbox" required');
    expect(html).toContain('/assets/trip-newsletter.js?v=2');
    expect(html).toContain('/polityka-prywatnosci.html');
  });
});
