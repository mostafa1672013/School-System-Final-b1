-- Perf US1: add missing indexes for ORDER BY createdAt DESC on high-volume list
-- endpoints (InventoryItem, DeliveryOrder). All other list models already had
-- createdAt indexes from the baseline migration (20260527000001).
-- Using CREATE INDEX IF NOT EXISTS to be idempotent across environments.

CREATE INDEX IF NOT EXISTS "InventoryItem_createdAt_idx"
  ON "InventoryItem" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "DeliveryOrder_createdAt_idx"
  ON "DeliveryOrder" ("createdAt" DESC);
