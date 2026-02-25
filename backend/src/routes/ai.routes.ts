import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All AI routes require authentication
router.use(authenticateToken);

// Productivity scoring
router.get('/productivity/:employeeId', AIController.getProductivityScore);
router.post('/batch-calculate', AIController.batchCalculate);
router.get('/scores', AIController.getAllScores);

// Skill gap detection
router.get('/skill-gaps/:employeeId', AIController.getEmployeeSkillGap);
router.get('/skill-gaps', AIController.getOrganizationSkillGaps);

// Smart task assignment
router.post('/recommend-assignment', AIController.getTaskRecommendations);
router.post('/validate-assignment/:employeeId', AIController.validateTaskAssignment);

// Performance trend prediction
router.get('/performance-trend/:employeeId', AIController.getPerformanceTrend);
router.get('/performance-trends', AIController.getOrganizationTrends);
router.get('/at-risk', AIController.getAtRiskEmployees);

export default router;
