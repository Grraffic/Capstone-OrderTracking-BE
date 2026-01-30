-- Migration: Update items status trigger to use reorder_point (Current Stock <= Reorder Point)
-- Matches the "At Reorder Point" table logic: At Reorder Point when reorder_point > 0 AND stock <= reorder_point.
-- Run this on your database to apply the change.

-- ============================================================================
-- TRIGGER FUNCTION: Auto-calculate inventory status based on stock and reorder_point
-- ============================================================================
-- Status logic (matches At Reorder Point table):
-- - "Out of Stock": stock = 0
-- - "At Reorder Point": reorder_point > 0 AND stock <= reorder_point (and stock > 0)
-- - "Critical": stock > 0 AND stock <= 10 (when not already at reorder point)
-- - "Above Threshold": otherwise
-- ============================================================================

CREATE OR REPLACE FUNCTION update_items_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN
    NEW.status = 'Out of Stock';
  ELSIF NEW.reorder_point IS NOT NULL AND NEW.reorder_point > 0 AND NEW.stock <= NEW.reorder_point THEN
    NEW.status = 'At Reorder Point';
  ELSIF NEW.stock >= 1 AND NEW.stock <= 10 THEN
    NEW.status = 'Critical';
  ELSE
    NEW.status = 'Above Threshold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to fire when stock OR reorder_point changes
DROP TRIGGER IF EXISTS trigger_update_items_status ON items;

CREATE TRIGGER trigger_update_items_status
  BEFORE INSERT OR UPDATE OF stock, reorder_point ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_items_status();

-- Optional: backfill status for existing rows (so current items reflect new logic)
UPDATE items
SET status = CASE
  WHEN stock = 0 THEN 'Out of Stock'
  WHEN reorder_point IS NOT NULL AND reorder_point > 0 AND stock <= reorder_point THEN 'At Reorder Point'
  WHEN stock >= 1 AND stock <= 10 THEN 'Critical'
  ELSE 'Above Threshold'
END
WHERE is_active = true;
