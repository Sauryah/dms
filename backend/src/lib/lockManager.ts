import { broadcastEvent } from './auditLogger';

export interface LockInfo {
  entityId: string;
  operatorId: string;
  operatorName: string;
  expiresAt: Date;
}

// In-memory store for active locks
const activeLocks = new Map<string, LockInfo>();

// Clean up expired locks periodically (every 5 seconds)
setInterval(() => {
  const now = new Date();
  for (const [entityId, lock] of activeLocks.entries()) {
    if (lock.expiresAt < now) {
      activeLocks.delete(entityId);
      console.log(`[LockManager] Lock on ${entityId} has expired.`);
      broadcastEvent({
        type: 'lock_change',
        data: {
          entityId,
          isLocked: false
        }
      });
    }
  }
}, 5000);

export const getLocks = (): LockInfo[] => {
  const now = new Date();
  const list: LockInfo[] = [];
  for (const [entityId, lock] of activeLocks.entries()) {
    if (lock.expiresAt >= now) {
      list.push(lock);
    }
  }
  return list;
};

export const acquireLock = (entityId: string, operatorId: string, operatorName: string): { success: boolean; lock?: LockInfo } => {
  const now = new Date();
  const existing = activeLocks.get(entityId);

  // If there's an existing active lock by a different user, deny!
  if (existing && existing.expiresAt >= now && existing.operatorId !== operatorId) {
    return { success: false, lock: existing };
  }

  // Create or renew the lock for 2 minutes (120000 ms)
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const lock: LockInfo = {
    entityId,
    operatorId,
    operatorName,
    expiresAt
  };

  activeLocks.set(entityId, lock);

  // Broadcast lock state to all SSE clients in real time
  broadcastEvent({
    type: 'lock_change',
    data: {
      entityId,
      operatorId,
      operatorName,
      expiresAt: expiresAt.toISOString(),
      isLocked: true
    }
  });

  return { success: true, lock };
};

export const releaseLock = (entityId: string, operatorId: string): boolean => {
  const existing = activeLocks.get(entityId);
  if (!existing) return false;

  // Only allow the lock owner to release it
  if (existing.operatorId === operatorId) {
    activeLocks.delete(entityId);
    
    // Broadcast lock release in real time
    broadcastEvent({
      type: 'lock_change',
      data: {
        entityId,
        isLocked: false
      }
    });
    return true;
  }

  return false;
};
