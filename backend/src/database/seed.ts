import { pool } from './pool';
import { logger } from '../utils/logger';

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Seed skill taxonomy
    logger.info('Seeding skill taxonomy...');
    await pool.query(`
      INSERT INTO skill_taxonomy (skill_name, category, description) VALUES
      -- Technical Skills
      ('JavaScript', 'Technical', 'Programming language for web development'),
      ('TypeScript', 'Technical', 'Typed superset of JavaScript'),
      ('Python', 'Technical', 'General-purpose programming language'),
      ('Java', 'Technical', 'Object-oriented programming language'),
      ('React', 'Technical', 'JavaScript library for building user interfaces'),
      ('Node.js', 'Technical', 'JavaScript runtime for server-side development'),
      ('SQL', 'Technical', 'Database query language'),
      ('PostgreSQL', 'Technical', 'Relational database management system'),
      ('MongoDB', 'Technical', 'NoSQL document database'),
      ('Docker', 'Technical', 'Containerization platform'),
      ('Kubernetes', 'Technical', 'Container orchestration platform'),
      ('AWS', 'Technical', 'Amazon Web Services cloud platform'),
      ('Git', 'Technical', 'Version control system'),
      ('REST API', 'Technical', 'RESTful API design and development'),
      ('GraphQL', 'Technical', 'Query language for APIs'),
      ('Solidity', 'Technical', 'Smart contract programming language'),
      ('Web3', 'Technical', 'Blockchain and decentralized applications'),
      
      -- Soft Skills
      ('Communication', 'Soft Skills', 'Effective verbal and written communication'),
      ('Leadership', 'Soft Skills', 'Ability to lead and motivate teams'),
      ('Problem Solving', 'Soft Skills', 'Analytical and critical thinking'),
      ('Time Management', 'Soft Skills', 'Efficient task prioritization and execution'),
      ('Teamwork', 'Soft Skills', 'Collaborative work with others'),
      ('Adaptability', 'Soft Skills', 'Flexibility in changing environments'),
      ('Creativity', 'Soft Skills', 'Innovative thinking and ideation'),
      ('Attention to Detail', 'Soft Skills', 'Thoroughness and accuracy'),
      
      -- Domain Expertise
      ('Project Management', 'Domain Expertise', 'Planning and executing projects'),
      ('Agile Methodology', 'Domain Expertise', 'Agile development practices'),
      ('UI/UX Design', 'Domain Expertise', 'User interface and experience design'),
      ('Data Analysis', 'Domain Expertise', 'Analyzing and interpreting data'),
      ('Machine Learning', 'Domain Expertise', 'ML algorithms and models'),
      ('DevOps', 'Domain Expertise', 'Development and operations practices'),
      ('Security', 'Domain Expertise', 'Cybersecurity and secure coding'),
      ('Testing', 'Domain Expertise', 'Software testing and QA'),
      ('System Architecture', 'Domain Expertise', 'Designing scalable systems')
      ON CONFLICT (skill_name) DO NOTHING
    `);

    // Seed role requirements
    logger.info('Seeding role requirements...');
    await pool.query(`
      INSERT INTO role_requirements (role_name, required_skills, priority_skills) VALUES
      ('Frontend Developer', 
        '["JavaScript", "TypeScript", "React", "HTML", "CSS"]'::jsonb,
        '["UI/UX Design", "Testing", "Git"]'::jsonb),
      ('Backend Developer',
        '["Node.js", "TypeScript", "SQL", "REST API"]'::jsonb,
        '["PostgreSQL", "Docker", "Testing", "Git"]'::jsonb),
      ('Full Stack Developer',
        '["JavaScript", "TypeScript", "React", "Node.js", "SQL"]'::jsonb,
        '["Docker", "AWS", "Git", "Testing"]'::jsonb),
      ('DevOps Engineer',
        '["Docker", "Kubernetes", "AWS", "Git"]'::jsonb,
        '["Python", "Bash", "Monitoring", "Security"]'::jsonb),
      ('Data Analyst',
        '["SQL", "Python", "Data Analysis"]'::jsonb,
        '["Machine Learning", "Statistics", "Visualization"]'::jsonb),
      ('UI/UX Designer',
        '["UI/UX Design", "Figma", "Adobe XD"]'::jsonb,
        '["HTML", "CSS", "User Research", "Prototyping"]'::jsonb),
      ('Project Manager',
        '["Project Management", "Agile Methodology", "Communication"]'::jsonb,
        '["Leadership", "Time Management", "Risk Management"]'::jsonb),
      ('QA Engineer',
        '["Testing", "Automation", "Bug Tracking"]'::jsonb,
        '["JavaScript", "Python", "CI/CD", "Git"]'::jsonb),
      ('Blockchain Developer',
        '["Solidity", "Web3", "JavaScript", "Smart Contracts"]'::jsonb,
        '["Ethereum", "Security", "Testing", "Git"]'::jsonb),
      ('Machine Learning Engineer',
        '["Python", "Machine Learning", "Data Analysis"]'::jsonb,
        '["TensorFlow", "PyTorch", "Statistics", "SQL"]'::jsonb)
      ON CONFLICT (role_name) DO NOTHING
    `);

    logger.info('✓ Database seeding completed successfully');
  } catch (error) {
    logger.error('✗ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
