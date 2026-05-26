import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/auditLogger';

/**
 * Retrieves the latest 50 audit log entries from the database,
 * sorted by creation timestamp descending.
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

/**
 * Exports all database audit log entries to a formatted CSV file stream download.
 */
export const exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
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
