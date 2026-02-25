import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

router.get('/metrics', DashboardController.getMetrics);
router.get('/trends', DashboardController.getTrends);

export default router;
