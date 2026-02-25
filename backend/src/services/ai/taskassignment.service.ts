import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

interface TaskRequirements {
  requiredSkills?: string[];
  complexity?: 'low' | 'medium' | 'high';
  department?: string;
  estimatedHours?: number;
}

interface EmployeeRecommendation {
  employeeId: number;
  employeeName: string;
  email: string;
  role: string;
  department: string;
  suitabilityScore: number; // 0-100
  reasoning: string[];
  currentWorkload: number;
  productivityScore: number;
  skillsMatch: number;
}

/**
 * Calculate skills match percentage
 */
function calculateSkillsMatch(
  employeeSkills: string[],
  requiredSkills: string[]
): number {
  if (!requiredSkills || requiredSkills.length === 0) {
    return 100; // No specific skills required
  }

  const matchedSkills = requiredSkills.filter(required =>
    employeeSkills.some(
      empSkill => empSkill.toLowerCase() === required.toLowerCase()
    )
  );

  return Math.round((matchedSkills.length / requiredSkills.length) * 100);
}

/**
 * Calculate workload score (0-100, higher is better = less busy)
 */
async function calculateWorkloadScore(
  employeeId: number,
  organizationId: string
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as active_tasks
       FROM tasks
       WHERE assigned_to = $1 
       AND organization_id = $2
       AND status IN ('assigned', 'in_progress')`,
      [employeeId, organizationId]
    );

    const activeTasks = parseInt(result.rows[0].active_tasks);

    // Score decreases as workload increases
    // 0 tasks = 100, 5 tasks = 50, 10+ tasks = 0
    if (activeTasks === 0) return 100;
    if (activeTasks >= 10) return 0;

    return Math.max(0, 100 - (activeTasks * 10));
  } catch (error) {
    logger.error('Error calculating workload score:', error);
    return 50; // Default middle score
  }
}

/**
 * Get employee's productivity score
 */
async function getProductivityScore(
  employeeId: number,
  organizationId: string
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT score FROM productivity_scores
       WHERE employee_id = $1 AND organization_id = $2
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [employeeId, organizationId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].score;
    }

    return 50; // Default baseline score
  } catch (error) {
    logger.error('Error getting productivity score:', error);
    return 50;
  }
}

/**
 * Calculate availability score based on recent activity
 */
async function calculateAvailabilityScore(
  employeeId: number,
  organizationId: string
): Promise<number> {
  try {
    // Check if employee has completed tasks recently
    const result = await pool.query(
      `SELECT COUNT(*) as recent_completions
       FROM tasks
       WHERE assigned_to = $1 
       AND organization_id = $2
       AND status = 'completed'
       AND completed_at > NOW() - INTERVAL '7 days'`,
      [employeeId, organizationId]
    );

    const recentCompletions = parseInt(result.rows[0].recent_completions);

    // More recent activity = higher availability score
    if (recentCompletions >= 3) return 100;
    if (recentCompletions >= 2) return 80;
    if (recentCompletions >= 1) return 60;
    return 40; // Less recent activity
  } catch (error) {
    logger.error('Error calculating availability score:', error);
    return 50;
  }
}

/**
 * Recommend employees for a task
 */
export async function recommendEmployeesForTask(
  taskRequirements: TaskRequirements,
  organizationId: string
): Promise<EmployeeRecommendation[]> {
  try {
    // Get all active employees
    let query = `
      SELECT id, name, email, role, department, skills
      FROM employees
      WHERE organization_id = $1 AND is_active = true
    `;
    const params: any[] = [organizationId];

    // Filter by department if specified
    if (taskRequirements.department) {
      query += ` AND LOWER(department) = LOWER($${params.length + 1})`;
      params.push(taskRequirements.department);
    }

    const employeesResult = await pool.query(query, params);
    const employees = employeesResult.rows;

    if (employees.length === 0) {
      return [];
    }

    // Calculate scores for each employee
    const recommendations: EmployeeRecommendation[] = [];

    for (const employee of employees) {
      const employeeSkills: string[] = employee.skills || [];
      const reasoning: string[] = [];

      // 1. Skills Match (40% weight)
      const skillsMatch = calculateSkillsMatch(
        employeeSkills,
        taskRequirements.requiredSkills || []
      );
      const skillsScore = skillsMatch * 0.4;

      if (skillsMatch === 100) {
        reasoning.push('Has all required skills');
      } else if (skillsMatch >= 75) {
        reasoning.push('Has most required skills');
      } else if (skillsMatch >= 50) {
        reasoning.push('Has some required skills');
      } else if (skillsMatch > 0) {
        reasoning.push('Has few required skills');
      } else {
        reasoning.push('Missing required skills');
      }

      // 2. Workload (30% weight)
      const workloadScore = await calculateWorkloadScore(
        employee.id,
        organizationId
      );
      const workloadWeighted = workloadScore * 0.3;

      if (workloadScore >= 80) {
        reasoning.push('Low current workload');
      } else if (workloadScore >= 50) {
        reasoning.push('Moderate workload');
      } else {
        reasoning.push('High current workload');
      }

      // 3. Productivity (20% weight)
      const productivityScore = await getProductivityScore(
        employee.id,
        organizationId
      );
      const productivityWeighted = productivityScore * 0.2;

      if (productivityScore >= 80) {
        reasoning.push('High productivity score');
      } else if (productivityScore >= 60) {
        reasoning.push('Good productivity score');
      } else {
        reasoning.push('Average productivity score');
      }

      // 4. Availability (10% weight)
      const availabilityScore = await calculateAvailabilityScore(
        employee.id,
        organizationId
      );
      const availabilityWeighted = availabilityScore * 0.1;

      if (availabilityScore >= 80) {
        reasoning.push('Recently active');
      }

      // Calculate total suitability score
      const suitabilityScore = Math.round(
        skillsScore + workloadWeighted + productivityWeighted + availabilityWeighted
      );

      // Filter out employees at maximum capacity
      const activeTasks = Math.round((100 - workloadScore) / 10);
      if (activeTasks >= 10) {
        reasoning.push('⚠️ At maximum task capacity');
      }

      recommendations.push({
        employeeId: employee.id,
        employeeName: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        suitabilityScore,
        reasoning,
        currentWorkload: activeTasks,
        productivityScore,
        skillsMatch,
      });
    }

    // Sort by suitability score (highest first)
    recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    // Return top 5 recommendations
    return recommendations.slice(0, 5);
  } catch (error) {
    logger.error('Error recommending employees for task:', error);
    throw error;
  }
}

/**
 * Get explanation for why an employee was recommended
 */
export function getRecommendationExplanation(
  recommendation: EmployeeRecommendation
): string {
  const parts: string[] = [];

  parts.push(`${recommendation.employeeName} (${recommendation.role})`);
  parts.push(`Suitability Score: ${recommendation.suitabilityScore}/100`);
  parts.push(`\nReasons:`);
  recommendation.reasoning.forEach(reason => {
    parts.push(`  • ${reason}`);
  });

  parts.push(`\nDetails:`);
  parts.push(`  • Skills Match: ${recommendation.skillsMatch}%`);
  parts.push(`  • Current Workload: ${recommendation.currentWorkload} active tasks`);
  parts.push(`  • Productivity Score: ${recommendation.productivityScore}/100`);

  return parts.join('\n');
}

/**
 * Validate if employee is suitable for task
 */
export async function validateEmployeeForTask(
  employeeId: number,
  taskRequirements: TaskRequirements,
  organizationId: string
): Promise<{
  suitable: boolean;
  score: number;
  warnings: string[];
}> {
  try {
    const recommendations = await recommendEmployeesForTask(
      taskRequirements,
      organizationId
    );

    const employeeRec = recommendations.find(r => r.employeeId === employeeId);

    if (!employeeRec) {
      return {
        suitable: false,
        score: 0,
        warnings: ['Employee not found or not active'],
      };
    }

    const warnings: string[] = [];

    if (employeeRec.skillsMatch < 50) {
      warnings.push('Employee missing most required skills');
    }

    if (employeeRec.currentWorkload >= 8) {
      warnings.push('Employee has high workload');
    }

    if (employeeRec.productivityScore < 40) {
      warnings.push('Employee has low productivity score');
    }

    const suitable = employeeRec.suitabilityScore >= 50 && warnings.length === 0;

    return {
      suitable,
      score: employeeRec.suitabilityScore,
      warnings,
    };
  } catch (error) {
    logger.error('Error validating employee for task:', error);
    return {
      suitable: false,
      score: 0,
      warnings: ['Error validating employee'],
    };
  }
}
