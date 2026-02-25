-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  complexity VARCHAR(50) NOT NULL,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  CHECK (status IN ('assigned', 'in_progress', 'completed')),
  CHECK (complexity IN ('low', 'medium', 'high'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(organization_id, completed_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE
    ON tasks FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_task_completed_timestamp BEFORE UPDATE
    ON tasks FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at();
