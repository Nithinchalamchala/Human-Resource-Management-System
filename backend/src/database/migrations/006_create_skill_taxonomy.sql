-- Create skill_taxonomy table
CREATE TABLE IF NOT EXISTS skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT
);

-- Create index on category for faster lookups
CREATE INDEX IF NOT EXISTS idx_skills_category ON skill_taxonomy(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skill_taxonomy(skill_name);
