import { Router } from 'express';
import { 
  EmployeeController, 
  createEmployeeValidation, 
  updateEmployeeValidation,
  connectWalletValidation 
} from '../controllers/employee.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All employee routes require authentication
router.use(authenticateToken);

router.post('/', createEmployeeValidation, EmployeeController.create);
router.get('/', EmployeeController.list);
router.get('/:id', EmployeeController.getOne);
router.put('/:id', updateEmployeeValidation, EmployeeController.update);
router.delete('/:id', EmployeeController.delete);
router.post('/:id/wallet', connectWalletValidation, EmployeeController.connectWallet);

export default router;
