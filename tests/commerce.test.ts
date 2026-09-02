import { beforeEach, describe, expect, it, vi } from "vitest";
import { commerceInternals, publicGuidePreview, publicRomePreview, publicRomeTest } from "../src/commerce";

describe("commerce security", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("accepts a current valid Stripe signature", async () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const timestamp = 1_800_000_000;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode("whsec_test"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`))), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(commerceInternals.verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, "whsec_test", timestamp * 1000)).resolves.toBe(true);
  });

  it("rejects an expired Stripe signature", async () => {
    await expect(commerceInternals.verifyStripeSignature("{}", "t=100,v1=bad", "whsec_test", 1_000_000)).resolves.toBe(false);
  });

  it("creates deterministic activation links that cannot be forged", async () => {
    const token = await commerceInternals.accessToken("cs_live_example", "secret");
    await expect(commerceInternals.validAccessToken(token, "secret")).resolves.toBe("cs_live_example");
    await expect(commerceInternals.validAccessToken(`${token}x`, "secret")).resolves.toBeNull();
    await expect(commerceInternals.validAccessToken(token, "different")).resolves.toBeNull();
  });

  it("places the individual activation link directly under /como/", async () => {
    const link = await commerceInternals.guideAccessLink("cs_live_example", "secret");
    const url = new URL(link);
    expect(url.origin).toBe("https://martynapodroze.pl");
    expect(url.pathname).toBe("/como/");
    await expect(commerceInternals.validAccessToken(url.searchParams.get("token") ?? "", "secret")).resolves.toBe("cs_live_example");
  });

  it("serves an unlisted preview only when the path token matches", async () => {
    const token = "Fn4Cd3FXCfkEWI-8K7qZRR20ZXuTHNkv";
    const fetchMock = vi.fn().mockResolvedValue(new Response("body{}", { status: 200, headers: { "Content-Type": "text/plain" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await publicGuidePreview(new Request(`https://martynapodroze.pl/podglad/como/${token}/styles.css`), { GUIDE_PREVIEW_TOKEN: token } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(fetchMock).toHaveBeenCalledWith("https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/f8200f534ea8ac506aa24681e54237aa6799532f/como/styles.css", expect.any(Object));

    const denied = await publicGuidePreview(new Request("https://martynapodroze.pl/podglad/como/not-a-real-token/"), { GUIDE_PREVIEW_TOKEN: token } as never);
    expect(denied.status).toBe(404);
  });

  it("serves Rome preview from its own product root", async () => {
    const token = "Fn4Cd3FXCfkEWI-8K7qZRR20ZXuTHNkv";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await publicRomePreview(new Request(`https://martynapodroze.pl/podglad/rzym/${token}/data/guide.json`), { GUIDE_PREVIEW_TOKEN: token } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(fetchMock).toHaveBeenCalledWith("https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/0751c8ad15feec896cb7ce10c7db0796b83b460f/rome/data/guide.json", expect.any(Object));
  });

  it("serves the public Rome test route without an access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<!doctype html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await publicRomeTest(new Request("https://martynapodroze.pl/romatest123/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(fetchMock).toHaveBeenCalledWith("https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/0751c8ad15feec896cb7ce10c7db0796b83b460f/rome/index.html", expect.any(Object));
  });
});
