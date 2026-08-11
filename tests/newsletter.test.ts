import { describe, expect, it } from "vitest";
import { NewsletterValidationError, parseNewsletterInput } from "../src/newsletter";

describe("newsletter input", () => {
  it("normalizes a valid double-opt-in request", () => {
    expect(parseNewsletterInput({
      email: " PODROZ.MARTYNA+TEST@gmail.com ",
      consent: true,
      website: ""
    })).toEqual({ email: "podroz.martyna+test@gmail.com", consent: true, isBot: false });
  });

  it("requires a valid email and explicit consent", () => {
    expect(() => parseNewsletterInput({ email: "nie-email", consent: true })).toThrow(NewsletterValidationError);
    expect(() => parseNewsletterInput({ email: "test@example.com", consent: false })).toThrow("zgodę");
  });

  it("silently marks the honeypot as a bot submission", () => {
    expect(parseNewsletterInput({
      email: "test@example.com",
      consent: true,
      website: "https://spam.example"
    }).isBot).toBe(true);
  });
});
