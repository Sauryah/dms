import jwt from 'jsonwebtoken';

interface BlacklistedToken {
  expiresAt: number; // Absolute timestamp in ms when the token originally expires
  blacklistedAt: number; // Timestamp in ms when the token was blacklisted
  gracePeriodUntil?: number; // Timestamp in ms until which the token is still accepted (for concurrent in-flight requests)
}

class TokenBlacklistManager {
  // Map of token signature to its blacklist metadata
  private blacklistMap = new Map<string, BlacklistedToken>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupScheduler();
  }

  /**
   * Extract the cryptographic signature from a JWT token.
   * Storing only the signature (3rd part of JWT) is highly memory efficient.
   */
  private getSignature(token: string): string {
    const parts = token.split('.');
    return parts[parts.length - 1] || token;
  }

  /**
   * Add a token to the blacklist.
   * @param token The full JWT token string.
   * @param expiresAtSeconds The JWT expiration time in seconds (from JWT exp claim).
   * @param gracePeriodMs Optional grace period in ms to allow pending in-flight requests.
   */
  public blacklist(token: string, expiresAtSeconds: number, gracePeriodMs = 0): void {
    const signature = this.getSignature(token);
    const now = Date.now();
    const expiresAtMs = expiresAtSeconds * 1000;

    // If the token is already expired, no need to blacklist it
    if (expiresAtMs <= now) return;

    this.blacklistMap.set(signature, {
      expiresAt: expiresAtMs,
      blacklistedAt: now,
      gracePeriodUntil: gracePeriodMs > 0 ? now + gracePeriodMs : undefined,
    });
  }

  /**
   * Check if a token is blacklisted.
   * Returns true if the token signature is blacklisted and any grace period has expired.
   */
  public isBlacklisted(token: string): boolean {
    const signature = this.getSignature(token);
    const entry = this.blacklistMap.get(signature);

    if (!entry) return false;

    const now = Date.now();

    // If there is an active grace period, let it pass
    if (entry.gracePeriodUntil && now < entry.gracePeriodUntil) {
      return false;
    }

    return true;
  }

  /**
   * Start a periodic scheduler to clean up expired blacklisted tokens.
   */
  private startCleanupScheduler(intervalMs = 60 * 60 * 1000): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let deletedCount = 0;

      for (const [signature, entry] of this.blacklistMap.entries()) {
        if (entry.expiresAt <= now) {
          this.blacklistMap.delete(signature);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[TokenBlacklist] Cleaned up ${deletedCount} expired blacklisted tokens.`);
      }
    }, intervalMs);

    // Allow process exit if this is the only timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Explicitly destroy the cleanup timer (useful for testing).
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get size of blacklist (for debugging).
   */
  public get size(): number {
    return this.blacklistMap.size;
  }
}

export const TokenBlacklist = new TokenBlacklistManager();
