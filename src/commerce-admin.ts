import { sendGuideAccessForOrder } from "./commerce";
import type { Env } from "./types";

interface GuideOrderRow {
  id: string;
  customer_email: string;
  amount_total: number;
  currency: string;
  status: string;
  email_sent_at: string | null;
  access_disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GuideDeviceRow {
  id: string;
  order_id: string;
  slot: number;
  created_at: string;
  last_used_at: string;
  revoked_at: string | null;
}

export interface GuideAccessCustomer extends GuideOrderRow {
  devices: GuideDeviceRow[];
}

const ORDER_ID = /^cs_(?:live|test)_[A-Za-z0-9]+$/;
const DEVICE_ID = /^[a-f0-9-]{36}$/i;

export function validCommerceOrderId(value: string): boolean {
  return ORDER_ID.test(value);
}

export function validCommerceDeviceId(value: string): boolean {
  return DEVICE_ID.test(value);
}

export async function listGuideAccessCustomers(env: Env): Promise<GuideAccessCustomer[]> {
  const [ordersResult, devicesResult] = await Promise.all([
    env.DB.prepare(`SELECT id, customer_email, amount_total, currency, status, email_sent_at,
      access_disabled_at, created_at, updated_at FROM commerce_orders ORDER BY created_at DESC`).all<GuideOrderRow>(),
    env.DB.prepare(`SELECT id, order_id, slot, created_at, last_used_at, revoked_at
      FROM commerce_devices ORDER BY order_id, slot`).all<GuideDeviceRow>()
  ]);
  const devicesByOrder = new Map<string, GuideDeviceRow[]>();
  for (const device of devicesResult.results ?? []) {
    const devices = devicesByOrder.get(device.order_id) ?? [];
    devices.push(device);
    devicesByOrder.set(device.order_id, devices);
  }
  return (ordersResult.results ?? []).map((order) => ({ ...order, devices: devicesByOrder.get(order.id) ?? [] }));
}

export async function setGuideAccessEnabled(env: Env, orderId: string, enabled: boolean): Promise<boolean> {
  const result = await env.DB.prepare(`UPDATE commerce_orders SET access_disabled_at = ${enabled ? "NULL" : "CURRENT_TIMESTAMP"},
    updated_at=CURRENT_TIMESTAMP WHERE id = ? AND status = 'paid'`).bind(orderId).run();
  return Boolean(result.meta.changes);
}

export async function revokeGuideDevice(env: Env, orderId: string, deviceId: string): Promise<boolean> {
  const result = await env.DB.prepare(`UPDATE commerce_devices SET revoked_at=CURRENT_TIMESTAMP
    WHERE id = ? AND order_id = ? AND revoked_at IS NULL`).bind(deviceId, orderId).run();
  return Boolean(result.meta.changes);
}

export async function resetGuideDevices(env: Env, orderId: string): Promise<boolean> {
  const order = await env.DB.prepare("SELECT id FROM commerce_orders WHERE id = ?").bind(orderId).first();
  if (!order) return false;
  await env.DB.prepare("UPDATE commerce_devices SET revoked_at=CURRENT_TIMESTAMP WHERE order_id = ? AND revoked_at IS NULL").bind(orderId).run();
  return true;
}

export async function resendGuideAccess(env: Env, orderId: string): Promise<boolean> {
  return sendGuideAccessForOrder(orderId, env, true);
}
