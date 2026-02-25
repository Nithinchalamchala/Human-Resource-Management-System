-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  skills JSONB DEFAULT '[]',
  wallet_address VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_wallet ON employees(wallet_address);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(organization_id, is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE
    ON employees FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
