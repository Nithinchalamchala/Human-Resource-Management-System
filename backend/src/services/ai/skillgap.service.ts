import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

interface SkillGap {
  skill: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface EmployeeSkillGap {
  employeeId: number;
  employeeName: string;
  role: string;
  currentSkills: string[];
  missingSkills: SkillGap[];
  skillGapScore: number; // 0-100, lower is better
}

interface OrganizationSkillGap {
  skill: string;
  employeesMissing: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedRoles: string[];
}

/**
 * Get skill requirements for a specific role
 */
async function getRoleRequirements(role: string): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT skills FROM role_requirements WHERE LOWER(role_name) = LOWER($1)`,
      [role]
    );

    if (result.rows.length > 0) {
      return result.rows[0].skills;
    }

    // Return default skills based on common role patterns
    return getDefaultSkillsForRole(role);
  } catch (error) {
    logger.error('Error fetching role requirements:', error);
    return getDefaultSkillsForRole(role);
  }
}

/**
 * Get default skills for common roles
 */
function getDefaultSkillsForRole(role: string): string[] {
  const roleLower = role.toLowerCase();

  const defaultSkills: { [key: string]: string[] } = {
    'frontend developer': ['JavaScript', 'HTML', 'CSS', 'React', 'TypeScript'],
    'backend developer': ['Node.js', 'Python', 'SQL', 'API Design', 'Database'],
    'full stack developer': ['JavaScript', 'Node.js', 'React', 'SQL', 'API Design'],
    'product manager': ['Product Strategy', 'Agile', 'User Research', 'Analytics'],
    'designer': ['Figma', 'UI/UX', 'Prototyping', 'Design Systems'],
    'ui/ux designer': ['Figma', 'Sketch', 'Prototyping', 'User Research'],
    'data scientist': ['Python', 'Machine Learning', 'Statistics', 'SQL'],
    'devops engineer': ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'],
    'qa engineer': ['Testing', 'Automation', 'Selenium', 'Jest'],
    'mobile developer': ['React Native', 'iOS', 'Android', 'Mobile UI'],
  };

  // Try to match role
  for (const [key, skills] of Object.entries(defaultSkills)) {
    if (roleLower.includes(key) || key.includes(roleLower)) {
      return skills;
    }
  }

  // Default generic skills
  return ['Communication', 'Problem Solving', 'Teamwork'];
}

/**
 * Determine priority of a skill gap
 */
function determineSkillPriority(
  skill: string,
  role: string,
  requiredSkills: string[]
): 'critical' | 'high' | 'medium' | 'low' {
  const skillLower = skill.toLowerCase();
  const roleLower = role.toLowerCase();

  // Critical skills - core technical skills for the role
  const criticalKeywords = ['javascript', 'python', 'java', 'sql', 'react', 'node'];
  if (criticalKeywords.some(keyword => skillLower.includes(keyword))) {
    return 'critical';
  }

  // High priority - important technical skills
  const highKeywords = ['typescript', 'api', 'database', 'testing', 'git'];
  if (highKeywords.some(keyword => skillLower.includes(keyword))) {
    return 'high';
  }

  // Medium priority - supporting skills
  const mediumKeywords = ['agile', 'scrum', 'ci/cd', 'docker'];
  if (mediumKeywords.some(keyword => skillLower.includes(keyword))) {
    return 'medium';
  }

  // Low priority - soft skills and nice-to-haves
  return 'low';
}

/**
 * Calculate skill gap for an employee
 */
export async function calculateEmployeeSkillGap(
  employeeId: number,
  organizationId: string
): Promise<EmployeeSkillGap | null> {
  try {
    // Get employee details
    const employeeResult = await pool.query(
      `SELECT id, name, role, skills FROM employees 
       WHERE id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );

    if (employeeResult.rows.length === 0) {
      return null;
    }

    const employee = employeeResult.rows[0];
    const currentSkills: string[] = employee.skills || [];
    const requiredSkills = await getRoleRequirements(employee.role);

    // Find missing skills
    const missingSkills: SkillGap[] = [];
    
    for (const requiredSkill of requiredSkills) {
      const hasSkill = currentSkills.some(
        skill => skill.toLowerCase() === requiredSkill.toLowerCase()
      );

      if (!hasSkill) {
        const priority = determineSkillPriority(
          requiredSkill,
          employee.role,
          requiredSkills
        );

        missingSkills.push({
          skill: requiredSkill,
          priority,
          reason: `Required for ${employee.role} role`,
        });
      }
    }

    // Calculate skill gap score (0-100, lower is better)
    const totalRequired = requiredSkills.length;
    const missingCount = missingSkills.length;
    const skillGapScore = totalRequired > 0 
      ? Math.round((missingCount / totalRequired) * 100)
      : 0;

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      currentSkills,
      missingSkills: missingSkills.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      skillGapScore,
    };
  } catch (error) {
    logger.error('Error calculating employee skill gap:', error);
    throw error;
  }
}

/**
 * Calculate organization-wide skill gaps
 */
export async function calculateOrganizationSkillGaps(
  organizationId: string
): Promise<OrganizationSkillGap[]> {
  try {
    // Get all employees
    const employeesResult = await pool.query(
      `SELECT id, name, role, skills FROM employees 
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );

    const employees = employeesResult.rows;
    const skillGapMap = new Map<string, {
      count: number;
      roles: Set<string>;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>();

    // Analyze each employee
    for (const employee of employees) {
      const currentSkills: string[] = employee.skills || [];
      const requiredSkills = await getRoleRequirements(employee.role);

      for (const requiredSkill of requiredSkills) {
        const hasSkill = currentSkills.some(
          skill => skill.toLowerCase() === requiredSkill.toLowerCase()
        );

        if (!hasSkill) {
          const priority = determineSkillPriority(
            requiredSkill,
            employee.role,
            requiredSkills
          );

          if (!skillGapMap.has(requiredSkill)) {
            skillGapMap.set(requiredSkill, {
              count: 0,
              roles: new Set(),
              priority,
            });
          }

          const gap = skillGapMap.get(requiredSkill)!;
          gap.count++;
          gap.roles.add(employee.role);

          // Upgrade priority if needed
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          if (priorityOrder[priority] < priorityOrder[gap.priority]) {
            gap.priority = priority;
          }
        }
      }
    }

    // Convert to array and sort by priority and count
    const organizationGaps: OrganizationSkillGap[] = Array.from(
      skillGapMap.entries()
    ).map(([skill, data]) => ({
      skill,
      employeesMissing: data.count,
      priority: data.priority,
      affectedRoles: Array.from(data.roles),
    }));

    // Sort by priority and then by count
    organizationGaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.employeesMissing - a.employeesMissing;
    });

    return organizationGaps;
  } catch (error) {
    logger.error('Error calculating organization skill gaps:', error);
    throw error;
  }
}

/**
 * Get skill gap recommendations for an employee
 */
export async function getSkillGapRecommendations(
  employeeId: number,
  organizationId: string
): Promise<{
  skillGap: EmployeeSkillGap | null;
  recommendations: string[];
}> {
  const skillGap = await calculateEmployeeSkillGap(employeeId, organizationId);

  if (!skillGap) {
    return { skillGap: null, recommendations: [] };
  }

  const recommendations: string[] = [];

  // Generate recommendations based on missing skills
  const criticalSkills = skillGap.missingSkills.filter(s => s.priority === 'critical');
  const highSkills = skillGap.missingSkills.filter(s => s.priority === 'high');

  if (criticalSkills.length > 0) {
    recommendations.push(
      `Focus on critical skills: ${criticalSkills.map(s => s.skill).join(', ')}`
    );
  }

  if (highSkills.length > 0) {
    recommendations.push(
      `Develop high-priority skills: ${highSkills.map(s => s.skill).join(', ')}`
    );
  }

  if (skillGap.skillGapScore > 50) {
    recommendations.push(
      'Consider enrolling in training programs or online courses'
    );
  }

  if (skillGap.skillGapScore > 70) {
    recommendations.push(
      'Significant skill gap detected. Recommend mentorship or role adjustment'
    );
  }

  if (skillGap.missingSkills.length === 0) {
    recommendations.push(
      'All required skills present! Consider advanced certifications'
    );
  }

  return { skillGap, recommendations };
}
