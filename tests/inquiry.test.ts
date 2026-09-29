import { afterEach, describe, expect, it, vi } from "vitest";
import { inquiryApi, parseInquiryInput, sendInquiryEmail } from "../src/inquiry";
import worker from "../worker/index";
import type { Env } from "../src/types";

const valid = {
  email: " ANNA@example.com ", "Imię": "Anna", "Wybrana usługa": "Indywidualny plan podróży",
  "Preferowany kontakt": "E-mail", "Kierunek podróży": "Rzym", "Lotniska wylotowe": "Warszawa",
  "Uczestnicy podróży": "Podróżuję solo", "Opis potrzeb": "Potrzebuję planu zwiedzania Rzymu na cztery dni.",
  "Zgoda na kontakt": "Tak", _honey: "", submissionId: "8b9f5837-1c74-4d6d-aae7-726d4cf46d4d"
};

function environment(attempts = 1): Env {
  const statement = { bind: vi.fn(), run: vi.fn().mockResolvedValue({ success: true }), first: vi.fn().mockResolvedValue({ attempts }) };
  statement.bind.mockReturnValue(statement);
  return { RESEND_API_KEY: "test-secret", TRANSACTIONAL_FROM_EMAIL: "Martyna <przewodnik@martynapodroze.pl>",
    VISITOR_SALT: "test-visitor-salt-more-than-16", DB: { prepare: vi.fn().mockReturnValue(statement) } } as unknown as Env;
}

function request(body: unknown = valid, overrides: RequestInit = {}): Request {
  return new Request("https://martynapodroze.pl/api/inquiry", { method: "POST",
    headers: { Origin: "https://martynapodroze.pl", Accept: "application/json", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
    body: JSON.stringify(body), ...overrides });
}

afterEach(() => vi.unstubAllGlobals());

describe("inquiry validation", () => {
  it("keeps all named travel fields and normalizes the reply address", () => {
    const input = parseInquiryInput({ ...valid, "Telefon": "123456789", "Termin podróży": "listopad", "Liczba dni": "4" });
    expect(input.email).toBe("anna@example.com");
    expect(input.fields["Telefon"]).toBe("123456789");
    expect(input.fields["Termin podróży"]).toBe("listopad");
    expect(input.submissionId).toBe(valid.submissionId);
  });
  it.each([
    { email: "anna@example.com\r\nBcc: other@example.com" }, { "Zgoda na kontakt": "Nie" },
    { "Wybrana usługa": "inna usługa" }, { "Lotniska wylotowe": "" }, { "Opis potrzeb": "Krótki opis" },
    { "Opis potrzeb": "a".repeat(5001) }, { "Liczba dni": "61" }, { "Liczba dni": "0" },
    { "Liczba dni": "1.5" }, { submissionId: "invalid" }
  ])("rejects invalid input: %j", changes => {
    expect(() => parseInquiryInput({ ...valid, ...changes })).toThrow();
  });
  it("recognizes bots without forwarding their content", () => {
    expect(parseInquiryInput({ _honey: "spam" }).isBot).toBe(true);
  });
});

describe("Resend delivery", () => {
  it("uses a fixed recipient, Reply-To, a timeout and repeatable idempotency key", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ id: "email-123" }));
    vi.stubGlobal("fetch", fetchMock);
    const input = parseInquiryInput({ ...valid, to: "attacker@example.com", "Opis potrzeb": "<script>alert('x')</script> To ma być zwykły tekst." });
    expect(await sendInquiryEmail(input, environment())).toBe(true);
    expect(await sendInquiryEmail(input, environment())).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body))).toMatchObject({ to: ["podroz.martyna@gmail.com"], reply_to: "anna@example.com" });
    expect(JSON.parse(String(init.body)).html).toBeUndefined();
    expect(JSON.parse(String(init.body)).text).toContain("Kierunek podróży: Rzym");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Idempotency-Key"));
  });
  it.each([503, 429, 401])("does not report provider error %i as success", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("error", { status })));
    expect(await sendInquiryEmail(parseInquiryInput(valid), environment())).toBe(false);
  });
  it("does not report network failures or malformed success responses as success", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendInquiryEmail(parseInquiryInput(valid), environment())).toBe(false);
    expect(await sendInquiryEmail(parseInquiryInput(valid), environment())).toBe(false);
  });
});

describe("inquiry API", () => {
  it("routes the site's endpoint and only acknowledges accepted mail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: "email-123" })));
    const response = await worker.fetch(request(), environment(), {} as ExecutionContext);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("keeps honeypot submissions away from both D1 and Resend", async () => {
    const env = environment();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await inquiryApi(request({ _honey: "spam" }), env)).status).toBe(202);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });
  it("rejects missing and cross-site origins before contacting Resend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const origin of ["", "https://evil.example"]) {
      expect((await inquiryApi(request(valid, { headers: { Origin: origin, Accept: "application/json", "Content-Type": "application/json" } }), environment())).status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("enforces the rate limit without storing the original IP", async () => {
    const env = environment(6);
    const response = await inquiryApi(request(), env);
    expect(response.status).toBe(429);
    const prepare = vi.mocked(env.DB.prepare);
    expect(prepare.mock.calls[1]?.[0]).toContain("RETURNING attempts");
    const statement = prepare.mock.results[1]?.value;
    expect(statement).toBeDefined();
    if (!statement) throw new Error("Missing rate-limit statement");
    expect(vi.mocked(statement.bind).mock.calls[1]?.[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(vi.mocked(statement.bind).mock.calls)).not.toContain("192.0.2.1");
  });
  it("fails closed if mail or database configuration is unavailable", async () => {
    const env = environment();
    delete env.RESEND_API_KEY;
    expect((await inquiryApi(request(), env)).status).toBe(503);
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });
  it("reports delivery failure with an actionable error, never a success redirect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
    const response = await inquiryApi(request(), environment());
    expect(response.status).toBe(503);
    expect(response.headers.get("Location")).toBeNull();
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("podroz.martyna@gmail.com") });
  });
  it("supports native form POST and redirects only after acceptance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: "email-123" })));
    const response = await inquiryApi(request(valid, { headers: { Origin: "https://martynapodroze.pl", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(valid) }), environment());
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/dziekujemy.html");
  });
  it("limits requests by their encoded size and rejects unsupported content types", async () => {
    expect((await inquiryApi(request({ message: "a".repeat(32_001) }), environment())).status).toBe(413);
    expect((await inquiryApi(request(valid, { headers: { Origin: "https://martynapodroze.pl", Accept: "application/json", "Content-Type": "text/plain" } }), environment())).status).toBe(415);
    expect((await inquiryApi(new Request("https://martynapodroze.pl/api/inquiry"), environment())).status).toBe(405);
  });
});
