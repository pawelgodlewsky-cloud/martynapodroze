import { beforeEach, describe, expect, it, vi } from "vitest";
import { commerceInternals } from "../src/commerce";

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
});
