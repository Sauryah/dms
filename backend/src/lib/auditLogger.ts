import prisma from './prisma';

/**
 * Utility helper to record an action to the database audit log table asynchronously.
 * 
 * @param actorId - The ID of the authenticated user who initiated the action.
 * @param actorName - The username of the user.
 * @param action - Action tag identifier (e.g., "CREATE_MACHINE", "ASSIGN_SET").
 * @param target - Name or identifier of the impacted asset (e.g., "Machine #101").
 * @param details - Human-readable descriptive details of the event.
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

    await prisma.auditLog.create({
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
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
};
