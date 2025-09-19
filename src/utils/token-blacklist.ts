import { logger } from './logger';

class TokenBlacklist {
  private blacklist: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanup();
  }

  /**
   * Add a token to the blacklist
   */
  revokeToken(tokenId: string): void {
    this.blacklist.add(tokenId);
    logger.info('Token revoked', { tokenId: tokenId.substring(0, 8) + '...' });
  }

  /**
   * Check if a token is revoked
   */
  isTokenRevoked(tokenId: string): boolean {
    return this.blacklist.has(tokenId);
  }

  /**
   * Remove expired tokens from blacklist
   * This is a simple cleanup - in production, you'd want to track expiration times
   */
  private cleanup(): void {
    // In a real implementation, you'd check token expiration times
    // For now, we'll just log the cleanup
    const beforeSize = this.blacklist.size;

    // Clear tokens older than a certain time - for this implementation,
    // we rely on JWT expiration and don't clean up automatically
    // In production, you'd want to store tokens with their expiration times

    logger.debug('Token blacklist cleanup completed', {
      tokensInBlacklist: this.blacklist.size,
      beforeSize
    });
  }

  /**
   * Start the cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup interval
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get the current size of the blacklist (for monitoring)
   */
  public getBlacklistSize(): number {
    return this.blacklist.size;
  }

  /**
   * Clear all revoked tokens (for testing purposes)
   */
  public clearAll(): void {
    this.blacklist.clear();
    logger.info('Token blacklist cleared');
  }
}

// Singleton instance
export const tokenBlacklist = new TokenBlacklist();