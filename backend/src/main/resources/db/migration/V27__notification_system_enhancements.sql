-- V24__notification_system_enhancements.sql
-- Non-destructively add event metadata, entity linkage, and deep linking to notifications

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);

-- Optimized indexes for user feed queries, unread counts, and target lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_event_target ON notifications(user_id, event_type, target_id, created_at DESC);
