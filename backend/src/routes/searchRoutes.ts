import { Router } from 'express';
import { universalSearch } from '../controllers/searchController';
import { authenticate } from '../middleware/authMiddleware';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authenticate, searchLimiter, universalSearch);

export default router;
