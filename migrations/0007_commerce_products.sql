ALTER TABLE commerce_orders ADD COLUMN product_slug TEXT NOT NULL DEFAULT 'lombardia';
CREATE INDEX IF NOT EXISTS idx_commerce_orders_product ON commerce_orders(product_slug, status);
