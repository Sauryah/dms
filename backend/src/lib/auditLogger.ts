import { Response } from 'express';
import prisma from './prisma';

export const sseClients = new Set<Response>();

export const broadcastEvent = (eventData: any) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      console.error('Failed to write to SSE client, removing:', err);
      sseClients.delete(client);
    }
  });
};

/**
 * Utility helper to record an action to the database audit log table asynchronously.
 */
export const logAction = async (
  actorId: string,
  actorName: string,
  action: string,
  target: string,
  details: string,
  req?: any
) => {
  try {
    const ipAddress = req 
      ? (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress) 
      : null;
    const userAgent = req 
      ? req.headers['user-agent'] 
      : null;

    const log = await prisma.auditLog.create({
      data: {
        actorId,
        actorName,
        action,
        target,
        details,
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent ? String(userAgent) : null,
      },
    });

    // Broadcast the new audit log in real time to all streaming subscribers!
    broadcastEvent({ type: 'audit_log', data: log });
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
};
