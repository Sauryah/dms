import { Router } from 'express';
import {
  getSets,
  getSetById,
  createSet,
  updateSet,
  deleteSet,
  assignDieToSet,
  bulkCreateSets,
} from '../controllers/setController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { createSetSchema, updateSetSchema, bulkCreateSetSchema } from '../lib/schemas';
import { importLimiter } from '../middleware/rateLimiter';

const router = Router();

// All set routes require authentication
router.use(authenticate);

router.get('/', getSets);
router.get('/:id', getSetById);

// Modifying routes require ADMIN or OPERATOR role
router.post('/bulk', authorize(['ADMIN', 'OPERATOR']), importLimiter, validateBody(bulkCreateSetSchema), bulkCreateSets);
router.post('/', authorize(['ADMIN']), validateBody(createSetSchema), createSet);
router.put('/:id', authorize(['ADMIN']), validateBody(updateSetSchema), updateSet);
router.delete('/:id', authorize(['ADMIN']), deleteSet);
router.post('/:setId/dies/:dieId', authorize(['ADMIN', 'OPERATOR']), assignDieToSet);

export default router;
