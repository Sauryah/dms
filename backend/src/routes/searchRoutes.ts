import { Router } from 'express';
import { universalSearch } from '../controllers/searchController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, universalSearch);

export default router;
