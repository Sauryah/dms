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

const backupsDir = path.join(workspaceRoot, 'backups');

// Make sure backup directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

/**
 * POST /api/dev/database/backup
 * Triggers a manual PostgreSQL database backup
 */
router.post('/database/backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `manual_backup_${timestamp}.dump`;
    const filepath = path.join(backupsDir, filename);

    // Extract connection parameters from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || '';
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid DATABASE_URL configuration.' });
    }

    const [_, user, password, host, port, dbName] = match;

    const env = {
      ...process.env,
      PGPASSWORD: password
    };

    const args = [
      '-U', user,
      '-h', host,
      '-d', dbName,
      '-F', 'c', // custom format (compressed)
      '-b', // include large objects
      '-v',
      '-f', filepath
    ];

    if (port) {
      args.push('-p', port);
    }

    const { spawn } = require('child_process');
    const pgDump = spawn('pg_dump', args, { env });

    let stderr = '';
    pgDump.stderr.on('data', (data: any) => {
      stderr += data.toString();
    });

    pgDump.on('close', (code: any) => {
      if (code !== 0) {
        console.error('pg_dump failed:', stderr);
        return res.status(500).json({ error: 'Database backup failed.', details: stderr });
      }

      res.json({
        message: 'Database backup completed successfully.',
        filename,
        sizeBytes: fs.statSync(filepath).size
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dev/database/backups
 * Returns a list of all existing database backups
 */
router.get('/database/backups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!fs.existsSync(backupsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter(file => file.endsWith('.dump'))
      .map(file => {
        const filepath = path.join(backupsDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(backups);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dev/database/restore
 * Restores the database from a selected backup file
 */
router.post('/database/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required.' });
    }

    const filepath = path.join(backupsDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup file not found.' });
    }

    const dbUrl = process.env.DATABASE_URL || '';
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid DATABASE_URL configuration.' });
    }

    const [_, user, password, host, port, dbName] = match;

    const env = {
      ...process.env,
      PGPASSWORD: password
    };

    const args = [
      '-U', user,
      '-h', host,
      '-d', dbName,
      '-c', // clean database (drop objects before recreating)
      '--no-owner',
      '--no-privileges',
      filepath
    ];

    if (port) {
      args.push('-p', port);
    }

    const { spawn } = require('child_process');
    const pgRestore = spawn('pg_restore', args, { env });

    let stderr = '';
    pgRestore.stderr.on('data', (data: any) => {
      stderr += data.toString();
    });

    pgRestore.on('close', (code: any) => {
      // Code 1 is warnings which are harmless during schema drops
      if (code !== 0 && code !== 1) {
        console.error('pg_restore failed:', stderr);
        return res.status(500).json({ error: 'Database restore failed.', details: stderr });
      }

      res.json({
        message: 'Database restore completed successfully.',
        filename
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/dev/database/backups/:filename
 * Deletes a selected backup file
 */
router.delete('/database/backups/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename as string;
    const filepath = path.join(backupsDir, filename);

    if (!fs.existsSync(filepath) || !filename.endsWith('.dump')) {
      return res.status(404).json({ error: 'Backup file not found.' });
    }

    fs.unlinkSync(filepath);
    res.json({ message: 'Backup file deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
