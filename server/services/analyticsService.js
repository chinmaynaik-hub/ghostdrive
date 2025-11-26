/**
 * Analytics Service
 * Tracks and logs important operations for monitoring and debugging
 * - Upload/download metrics
 * - Blockchain transaction success rates
 * - Error tracking
 */

class AnalyticsService {
  constructor() {
    // In-memory metrics (could be extended to use Redis or a database)
    this.metrics = {
      uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        totalBytes: 0
      },
      downloads: {
        total: 0,
        successful: 0,
        failed: 0,
        totalBytes: 0
      },
      blockchain: {
        transactions: 0,
        successful: 0,
        failed: 0,
        retries: 0,
        avgConfirmationTime: 0,
        totalConfirmationTime: 0
      },
      verification: {
        total: 0,
        verified: 0,
        failed: 0
      },
      cleanup: {
        runs: 0,
        filesDeleted: 0,
        bytesFreed: 0
      },
      errors: []
    };
    
    // Start time for uptime calculation
    this.startTime = Date.now();
    
    // Max errors to keep in memory
    this.maxErrors = 100;
  }

  /**
   * Log an upload operation
   */
  logUpload(success, fileSize = 0, details = {}) {
    this.metrics.uploads.total++;
    if (success) {
      this.metrics.uploads.successful++;
      this.metrics.uploads.totalBytes += fileSize;
    } else {
      this.metrics.uploads.failed++;
    }
    
    console.log(`[ANALYTICS] Upload: ${success ? 'SUCCESS' : 'FAILED'}`, {
      fileSize: this._formatBytes(fileSize),
      ...details
    });
  }


  /**
   * Log a download operation
   */
  logDownload(success, fileSize = 0, details = {}) {
    this.metrics.downloads.total++;
    if (success) {
      this.metrics.downloads.successful++;
      this.metrics.downloads.totalBytes += fileSize;
    } else {
      this.metrics.downloads.failed++;
    }
    
    console.log(`[ANALYTICS] Download: ${success ? 'SUCCESS' : 'FAILED'}`, {
      fileSize: this._formatBytes(fileSize),
      ...details
    });
  }

  /**
   * Log a blockchain transaction
   */
  logBlockchainTransaction(success, confirmationTime = 0, retryCount = 0, details = {}) {
    this.metrics.blockchain.transactions++;
    this.metrics.blockchain.retries += retryCount;
    
    if (success) {
      this.metrics.blockchain.successful++;
      this.metrics.blockchain.totalConfirmationTime += confirmationTime;
      this.metrics.blockchain.avgConfirmationTime = 
        this.metrics.blockchain.totalConfirmationTime / this.metrics.blockchain.successful;
    } else {
      this.metrics.blockchain.failed++;
    }
    
    console.log(`[ANALYTICS] Blockchain TX: ${success ? 'SUCCESS' : 'FAILED'}`, {
      confirmationTime: `${confirmationTime}ms`,
      retries: retryCount,
      ...details
    });
  }

  /**
   * Log a file verification
   */
  logVerification(verified, details = {}) {
    this.metrics.verification.total++;
    if (verified) {
      this.metrics.verification.verified++;
    } else {
      this.metrics.verification.failed++;
    }
    
    console.log(`[ANALYTICS] Verification: ${verified ? 'VERIFIED' : 'FAILED'}`, details);
  }

  /**
   * Log a cleanup operation
   */
  logCleanup(filesDeleted, bytesFreed = 0, duration = 0) {
    this.metrics.cleanup.runs++;
    this.metrics.cleanup.filesDeleted += filesDeleted;
    this.metrics.cleanup.bytesFreed += bytesFreed;
    
    console.log(`[ANALYTICS] Cleanup completed`, {
      filesDeleted,
      bytesFreed: this._formatBytes(bytesFreed),
      duration: `${duration}ms`
    });
  }

  /**
   * Log an error
   */
  logError(category, error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      category,
      message: error.message || error,
      stack: error.stack,
      context
    };
    
    this.metrics.errors.unshift(errorEntry);
    
    // Keep only the most recent errors
    if (this.metrics.errors.length > this.maxErrors) {
      this.metrics.errors = this.metrics.errors.slice(0, this.maxErrors);
    }
    
    console.error(`[ANALYTICS] Error in ${category}:`, error.message, context);
  }

  /**
   * Get current metrics summary
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: this._formatDuration(uptime),
      uptimeMs: uptime,
      uploads: {
        ...this.metrics.uploads,
        successRate: this._calculateRate(
          this.metrics.uploads.successful, 
          this.metrics.uploads.total
        ),
        totalBytesFormatted: this._formatBytes(this.metrics.uploads.totalBytes)
      },
      downloads: {
        ...this.metrics.downloads,
        successRate: this._calculateRate(
          this.metrics.downloads.successful, 
          this.metrics.downloads.total
        ),
        totalBytesFormatted: this._formatBytes(this.metrics.downloads.totalBytes)
      },
      blockchain: {
        ...this.metrics.blockchain,
        successRate: this._calculateRate(
          this.metrics.blockchain.successful, 
          this.metrics.blockchain.transactions
        ),
        avgConfirmationTimeFormatted: `${Math.round(this.metrics.blockchain.avgConfirmationTime)}ms`
      },
      verification: {
        ...this.metrics.verification,
        verificationRate: this._calculateRate(
          this.metrics.verification.verified, 
          this.metrics.verification.total
        )
      },
      cleanup: {
        ...this.metrics.cleanup,
        bytesFreedFormatted: this._formatBytes(this.metrics.cleanup.bytesFreed)
      },
      recentErrors: this.metrics.errors.slice(0, 10)
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      uploads: { total: 0, successful: 0, failed: 0, totalBytes: 0 },
      downloads: { total: 0, successful: 0, failed: 0, totalBytes: 0 },
      blockchain: { 
        transactions: 0, successful: 0, failed: 0, retries: 0, 
        avgConfirmationTime: 0, totalConfirmationTime: 0 
      },
      verification: { total: 0, verified: 0, failed: 0 },
      cleanup: { runs: 0, filesDeleted: 0, bytesFreed: 0 },
      errors: []
    };
    this.startTime = Date.now();
  }

  // Helper methods
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  _calculateRate(success, total) {
    if (total === 0) return '0%';
    return `${((success / total) * 100).toFixed(1)}%`;
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
module.exports = analyticsService;
