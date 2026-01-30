-- FIFO Unit Price: First In, First Out
-- Unit price for beginning inventory is used first; after beginning inventory is exhausted,
-- the next unit price is from purchases.
-- This migration adds beginning_inventory_unit_price so valuation uses:
--   (beginning_inventory * beginning_inventory_unit_price) + (purchases * price)

-- Add column to items table (nullable for backward compatibility; when NULL, use price for both)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS beginning_inventory_unit_price NUMERIC(10,2) CHECK (beginning_inventory_unit_price >= 0);

COMMENT ON COLUMN items.beginning_inventory_unit_price IS 'FIFO: Unit price of beginning inventory. First units are valued at this price; remaining units use price (purchase unit price).';

-- Backfill: for existing rows, set beginning_inventory_unit_price = price so current behavior is unchanged
UPDATE items
SET beginning_inventory_unit_price = price
WHERE beginning_inventory_unit_price IS NULL AND (beginning_inventory > 0 OR price > 0);
