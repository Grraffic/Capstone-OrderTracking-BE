-- ============================================
-- Create Notifications Table
-- La Verdad Uniform Ordering System - Restock Notification Feature
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Information
  user_id TEXT NOT NULL, -- Firebase UID of the student
  
  -- Notification Details
  type TEXT NOT NULL CHECK (type IN ('restock', 'order', 'system', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- Additional data (item details, order info, etc.)
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Add trigger to update read_at timestamp when is_read changes to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_read_at ON notifications;

CREATE TRIGGER trigger_update_notification_read_at
  BEFORE UPDATE OF is_read ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_read_at();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications for restock alerts, order updates, and system announcements';
COMMENT ON COLUMN notifications.user_id IS 'Firebase UID of the user receiving the notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification: restock, order, system, or announcement';
COMMENT ON COLUMN notifications.data IS 'JSON data containing additional notification details (item info, order number, etc.)';

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Policy: Service role has full access (for backend to create notifications)
CREATE POLICY "Service role has full access to notifications"
  ON notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Verification Queries
-- ============================================

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications';

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications';

-- ============================================
-- Sample Data (for testing)
-- ============================================

-- Uncomment to insert sample notification:
/*
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  data
) VALUES (
  'YOUR_FIREBASE_UID_HERE',
  'restock',
  'Item Back in Stock!',
  'Good news! Kinder Dress (Kindergarten, Size: Small) is now available for your order #ORD-20240101-123456',
  '{
    "itemName": "Kinder Dress",
    "educationLevel": "Kindergarten",
    "size": "Small",
    "orderNumber": "ORD-20240101-123456",
    "inventoryId": "inventory-uuid-here"
  }'::jsonb
)
RETURNING *;
*/

-- ============================================
-- Cleanup (if needed)
-- ============================================

-- Uncomment to drop the table and start fresh:
-- DROP TABLE IF EXISTS notifications CASCADE;

