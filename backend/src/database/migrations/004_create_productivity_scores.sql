-- Create productivity_scores table
CREATE TABLE IF NOT EXISTS productivity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  completion_rate DECIMAL(5,2),
  avg_completion_time DECIMAL(10,2),
  complexity_bonus DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_productivity_employee ON productivity_scores(employee_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_productivity_org ON productivity_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_productivity_score ON productivity_scores(organization_id, score DESC);

-- Create unique constraint to prevent duplicate scores at same timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_productivity_unique ON productivity_scores(employee_id, calculated_at);
