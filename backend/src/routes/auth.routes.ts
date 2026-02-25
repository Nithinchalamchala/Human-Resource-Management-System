import { Router } from 'express';
import { AuthController, registerValidation, loginValidation } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.get('/me', authenticateToken, AuthController.me);

export default router;
