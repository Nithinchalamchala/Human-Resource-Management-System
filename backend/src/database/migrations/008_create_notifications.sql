-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (type IN ('task_assigned', 'task_updated', 'task_completed', 'system'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Create trigger to auto-delete old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER cleanup_old_notifications AFTER INSERT
    ON notifications
    EXECUTE FUNCTION delete_old_notifications();
