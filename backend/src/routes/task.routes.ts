import { Router } from 'express';
import { 
  TaskController, 
  createTaskValidation, 
  updateTaskValidation,
  updateStatusValidation 
} from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

router.post('/', createTaskValidation, TaskController.create);
router.get('/', TaskController.list);
router.get('/:id', TaskController.getOne);
router.put('/:id', updateTaskValidation, TaskController.update);
router.patch('/:id/status', updateStatusValidation, TaskController.updateStatus);
router.delete('/:id', TaskController.delete);

export default router;
