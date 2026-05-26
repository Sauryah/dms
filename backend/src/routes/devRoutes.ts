import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { devReindexLimiter } from '../middleware/rateLimiter';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();

// Resolve paths dynamically
// In production (Docker), the root is /app. In dev, it's the project root.
const workspaceRoot = process.env.NODE_ENV === 'production' ? '/app' : path.join(__dirname, '..', '..', '..');
const graphJsonPath = path.join(workspaceRoot, 'graphify-out', 'graph.json');

// All dev routes require ADMIN privileges for enterprise safety
router.use(authenticate, authorize(['ADMIN']));

/**
 * GET /api/dev/codebase-graph
 * Reads and returns the pre-compiled graphify-out/graph.json codebase dependency map.
 */
router.get('/codebase-graph', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!fs.existsSync(graphJsonPath)) {
      return res.status(404).json({ error: 'Codebase graph JSON not found. Please run re-index.' });
    }

    const rawData = fs.readFileSync(graphJsonPath, 'utf-8');
    const graphData = JSON.parse(rawData);
    res.json(graphData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dev/codebase-graph/reindex
 * Securely spawns a shell process to run "graphify update ." in the workspace root.
 * Restricts injection vectors completely as it runs a hardcoded parameterized script.
 */
router.post('/codebase-graph/reindex', devReindexLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    execFile('graphify', ['update', '.'], { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to execute graphify update:', error);
        const isMissingCli = (error as NodeJS.ErrnoException).code === 'ENOENT';
        const statusCode = isMissingCli ? 503 : 500;
        const hint = isMissingCli
          ? 'The graphify CLI is not installed or is not available on PATH in this runtime.'
          : stderr || error.message;

        return res.status(statusCode).json({ error: `Re-indexing failed: ${hint}` });
      }

      // Read the freshly indexed graph data
      if (!fs.existsSync(graphJsonPath)) {
        return res.status(404).json({ error: 'Codebase graph was not generated after re-indexing.' });
      }

      try {
        const rawData = fs.readFileSync(graphJsonPath, 'utf-8');
        const graphData = JSON.parse(rawData);
        res.json({
          message: 'Codebase re-indexed successfully.',
          graph: graphData,
          output: stdout,
        });
      } catch (readErr: any) {
        res.status(500).json({ error: `Failed to read newly indexed graph: ${readErr.message}` });
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
