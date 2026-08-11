import { describe, expect, it } from "vitest";
import { escapeHtml, formatTripDates, makeTripSlug, parseTripInput, slugify, validateHttpUrl, ValidationError } from "../src/trips";

const validTrip = {
  destination: "Bergamo",
  country: "Włochy",
  country_emoji: "🇮🇹",
  departure_city: "Warszawa",
  departure_airport: "Warszawa Modlin",
  start_date: "2026-09-02",
  end_date: "2026-09-04",
  total_price: 571,
  currency: "PLN",
  personal_note: "Świetny kierunek.",
  status: "active",
  links: [
    { type: "flight", label: "Warszawa → Bergamo", from_location: "Warszawa", to_location: "Bergamo", provider: "Ryanair", price: 198, url: "https://ryanair.com/example" },
    { type: "lodging", label: "Apartment Bergamo Centro", nights: 2, price: 373, url: "https://booking.com/example" }
  ]
};

describe("trip helpers", () => {
  it("creates the expected readable Polish slug", () => {
    expect(makeTripSlug("Bergamo", "2026-09-02", "2026-09-04")).toBe("bergamo-2-4-wrzesnia");
    expect(slugify("Łódź i Como!" )).toBe("lodz-i-como");
  });

  it("normalizes a complete trip", () => {
    const parsed = parseTripInput(validTrip);
    expect(parsed.slug).toBe("bergamo-2-4-wrzesnia");
    expect(parsed.links).toHaveLength(2);
    expect(parsed.links[0]?.currency).toBe("PLN");
  });

  it("rejects unsafe URL schemes and missing required link types", () => {
    expect(() => validateHttpUrl("javascript:alert(1)")).toThrow(ValidationError);
    expect(() => parseTripInput({ ...validTrip, links: [validTrip.links[0], { ...validTrip.links[0], type: "transfer" }] })).toThrow("nocleg");
  });

  it("escapes user content and formats date ranges", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(formatTripDates("2026-09-02", "2026-09-04")).toBe("2–4 września 2026");
  });
});
