import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { getLocks, acquireLock, releaseLock } from '../lib/lockManager';

const router = Router();

// All lock routes require authentication
router.use(authenticate as any);

/**
 * GET /api/locks
 * Returns all active operational locks
 */
router.get('/', (req: AuthRequest, res: Response) => {
  const locks = getLocks();
  res.json(locks);
});

/**
 * POST /api/locks/acquire
 * Acquires a temporary lease lock on a Machine or Set
 */
router.post('/acquire', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.body;
    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID is required.' });
    }

    const operatorId = req.user?.id;
    const operatorName = req.user?.username;

    if (!operatorId || !operatorName) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const result = acquireLock(entityId, operatorId, operatorName);

    if (!result.success) {
      return res.status(409).json({
        error: 'This resource is currently locked by another operator.',
        lock: result.lock
      });
    }

    res.json({
      message: 'Lock acquired successfully.',
      lock: result.lock
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/locks/release
 * Manually releases an active lock owned by the current operator
 */
router.post('/release', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.body;
    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID is required.' });
    }

    const operatorId = req.user?.id;
    if (!operatorId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const released = releaseLock(entityId, operatorId);

    if (!released) {
      return res.status(403).json({
        error: 'You do not own this lock or the lock has already expired.'
      });
    }

    res.json({ message: 'Lock released successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
