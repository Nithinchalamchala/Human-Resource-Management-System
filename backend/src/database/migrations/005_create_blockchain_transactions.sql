-- Create blockchain_transactions table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  data_hash VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  block_number BIGINT,
  gas_used BIGINT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  CHECK (status IN ('pending', 'confirmed', 'failed')),
  CHECK (event_type IN ('task_completion', 'payroll_proof', 'activity_hash'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blockchain_org ON blockchain_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_employee ON blockchain_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_created ON blockchain_transactions(created_at);
