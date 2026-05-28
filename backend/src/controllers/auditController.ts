import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/auditLogger';

/**
 * Retrieves the latest 50 audit log entries from the database,
 * sorted by creation timestamp descending.
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const { actor, action, startDate, endDate, search } = req.query;

  // Build prisma where filter object
  const where: any = {};

  if (actor) {
    where.actorName = {
      contains: actor as string,
    };
  }

  if (action) {
    where.action = action as string;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search) {
    const term = search as string;
    where.OR = [
      { actorName: { contains: term } },
      { action: { contains: term } },
      { target: { contains: term } },
      { details: { contains: term } }
    ];
  }

  try {
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exports all database audit log entries to a formatted CSV file stream download.
 */
export const exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  const { actor, action, startDate, endDate, search } = req.query;

  // Build prisma where filter object identically
  const where: any = {};

  if (actor) {
    where.actorName = {
      contains: actor as string,
    };
  }

  if (action) {
    where.action = action as string;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search) {
    const term = search as string;
    where.OR = [
      { actorName: { contains: term } },
      { action: { contains: term } },
      { target: { contains: term } },
      { details: { contains: term } }
    ];
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Construct clean CSV payload
    const headers = ['Timestamp', 'Actor Name', 'Action', 'Target', 'Details', 'IP Address', 'Client User Agent'];
    
    // Helper to safely wrap values with quotes and escape embedded quotes
    const escapeCSV = (val: string | Date | null | undefined) => {
      if (val === null || val === undefined) return '""';
      // Format Dates properly
      if (val instanceof Date) {
        val = val.toISOString();
      }
      const cleanVal = String(val).replace(/"/g, '""');
      return `"${cleanVal}"`;
    };

    const rows = logs.map(log => [
      escapeCSV(log.createdAt),
      escapeCSV(log.actorName),
      escapeCSV(log.action),
      escapeCSV(log.target),
      escapeCSV(log.details),
      escapeCSV(log.ipAddress),
      escapeCSV(log.userAgent)
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Set Response Headers for File Stream Download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_log_export_${Date.now()}.csv`);
    
    // Log the export action itself
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'EXPORT_LOGS', 'Excel Ingest', `Exported ${logs.length} shop floor audit logs to CSV`, req);
    }

    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
