import { Router } from 'express';
import { getAuditLogs, exportAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Audit logs include operational and client metadata, so keep them admin-only.
router.use(authenticate, authorize(['ADMIN']));

router.get('/', getAuditLogs);
router.get('/export', exportAuditLogs);

export default router;
