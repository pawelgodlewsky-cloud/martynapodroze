CREATE TABLE commerce_devices_v2 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2, 3)),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  UNIQUE (order_id, slot)
);

INSERT INTO commerce_devices_v2 (id, order_id, slot, token_hash, created_at, last_used_at, revoked_at)
SELECT id, order_id, slot, token_hash, created_at, last_used_at, revoked_at
FROM commerce_devices;

DROP TABLE commerce_devices;
ALTER TABLE commerce_devices_v2 RENAME TO commerce_devices;

CREATE INDEX idx_commerce_devices_order ON commerce_devices(order_id, revoked_at);
