-- Create role_requirements table
CREATE TABLE IF NOT EXISTS role_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(100) NOT NULL UNIQUE,
  required_skills JSONB NOT NULL,
  priority_skills JSONB DEFAULT '[]'
);

-- Create index on role_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_requirements_name ON role_requirements(role_name);
