import { Router } from 'express';
import { getAuditLogs, exportAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { sseClients } from '../lib/auditLogger';

const router = Router();

// Stream is open to all authenticated users for real-time telemetry (locks, timeline, updates)
router.get('/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Periodic heartbeat pings to keep active routers/firewalls open
  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Audit logs include operational and client metadata, so keep them admin-only.
router.use(authenticate, authorize(['ADMIN']));

router.get('/', getAuditLogs);
router.get('/export', exportAuditLogs);

export default router;
