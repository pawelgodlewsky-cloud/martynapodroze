import { describe, expect, it } from "vitest";
import { analyticsConsent, visitorForRequest } from "../src/events";

describe("analytics cookie consent", () => {
  it("does not create or read a visitor before consent", () => {
    const request = new Request("https://martynapodroze.pl/w/test", {
      headers: { Cookie: "mp_visitor=22c9dad9-c53a-411a-a33c-d73afc8f15e3" }
    });
    expect(analyticsConsent(request)).toBe(false);
    expect(visitorForRequest(request)).toBeNull();
  });

  it("creates a visitor only after explicit analytics consent", () => {
    const request = new Request("https://martynapodroze.pl/w/test", {
      headers: { Cookie: "mp_cookie_consent=analytics-v1" }
    });
    expect(analyticsConsent(request)).toBe(true);
    const visitor = visitorForRequest(request);
    expect(visitor?.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(visitor?.setCookie).toContain("mp_visitor=");
    expect(visitor?.setCookie).toContain("Max-Age=15552000");
    expect(visitor?.setCookie).not.toContain("HttpOnly");
  });

  it("respects rejection of optional cookies", () => {
    const request = new Request("https://martynapodroze.pl/w/test", {
      headers: { Cookie: "mp_cookie_consent=necessary-v1" }
    });
    expect(analyticsConsent(request)).toBe(false);
    expect(visitorForRequest(request)).toBeNull();
  });
});
