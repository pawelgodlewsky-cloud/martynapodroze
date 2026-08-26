import { describe, expect, it } from "vitest";
import { listGuideAccessCustomers, validCommerceDeviceId, validCommerceOrderId } from "../src/commerce-admin";
import type { Env } from "../src/types";

describe("guide access administration", () => {
  it("accepts only Stripe Checkout order ids and UUID device ids", () => {
    expect(validCommerceOrderId("cs_live_abc123")).toBe(true);
    expect(validCommerceOrderId("../commerce_orders")).toBe(false);
    expect(validCommerceDeviceId("d9428888-122b-11e1-b85c-61cd3cbb3210")).toBe(true);
    expect(validCommerceDeviceId("device-1")).toBe(false);
  });

  it("groups device records under the correct customer without exposing tokens", async () => {
    const order = {
      id: "cs_live_abc123", customer_email: "klient@example.com", amount_total: 5900, currency: "pln",
      status: "paid", email_sent_at: "2026-08-26 08:00:00", access_disabled_at: null,
      created_at: "2026-08-26 08:00:00", updated_at: "2026-08-26 08:00:00"
    };
    const device = {
      id: "d9428888-122b-11e1-b85c-61cd3cbb3210", order_id: order.id, slot: 1,
      created_at: "2026-08-26 08:01:00", last_used_at: "2026-08-26 08:02:00", revoked_at: null
    };
    let query = 0;
    const env = {
      DB: {
        prepare: () => ({ all: async () => ({ results: query++ === 0 ? [order] : [device] }) })
      }
    } as unknown as Env;
    const customers = await listGuideAccessCustomers(env);
    expect(customers).toEqual([{ ...order, devices: [device] }]);
    expect(JSON.stringify(customers)).not.toContain("token_hash");
  });
});
