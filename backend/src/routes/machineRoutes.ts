import { Router } from 'express';
import {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  assignSetToMachine,
  getDashboardStats,
} from '../controllers/machineController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { createMachineSchema, updateMachineSchema } from '../lib/schemas';

const router = Router();

// All machine routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/', getMachines);
router.get('/:id', getMachineById);

// Modifying routes require ADMIN role
router.post('/', authorize(['ADMIN']), validateBody(createMachineSchema), createMachine);
router.put('/:id', authorize(['ADMIN']), validateBody(updateMachineSchema), updateMachine);
router.delete('/:id', authorize(['ADMIN']), deleteMachine);
router.post('/:machineId/sets/:setId', authorize(['ADMIN', 'OPERATOR']), assignSetToMachine);

export default router;
