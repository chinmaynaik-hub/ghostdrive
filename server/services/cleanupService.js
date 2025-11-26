const cron = require('node-cron');
const { Op } = require('sequelize');
const File = require('../models/File');
const fs = require('fs');
const analyticsService = require('./analyticsService');

/**
 * Cleanup Service
 * Automatically identifies and deletes expired files based on:
 * - Expiry time has passed
 * - View limit has been exhausted (viewsRemaining = 0)
 */
class CleanupService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Initialize and start the cleanup cron job
   * Runs every 1 hour as per requirement 8.1
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️  Cleanup service is already running');
      return;
    }

    // Schedule cleanup job to run every hour (0 * * * *)
    // Format: minute hour day month weekday
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.runCleanup();
    });

    console.log('✓ Cleanup service started - will run every hour');
  }

  /**
   * Stop the cleanup cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✓ Cleanup service stopped');
    }
  }

  /**
   * Main cleanup logic
   * Identifies and deletes expired files
   */
  async runCleanup() {
    if (this.isRunning) {
      console.log('⚠️  Cleanup job already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('\n========================================');
    console.log('🧹 Starting cleanup job...');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('========================================');

    try {
      const now = new Date();
      let totalDeleted = 0;
      let filesystemDeleted = 0;
      let databaseDeleted = 0;
      let errors = 0;

      // Optimized single query to find all expired files
      // Uses composite indexes: idx_status_expiry and idx_status_views
      const uniqueExpiredFiles = await File.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            // Files where expiryTime has passed (Requirement 8.2)
            { expiryTime: { [Op.lt]: now } },
            // Files where viewsRemaining is 0 (Requirement 8.3)
            { viewsRemaining: { [Op.lte]: 0 } }
          ]
        },
        // Only select fields needed for cleanup to reduce memory usage
        attributes: ['id', 'originalName', 'filePath', 'expiryTime', 'viewsRemaining']
      });

      // Count by reason for logging
      const expiredByTime = uniqueExpiredFiles.filter(f => new Date(f.expiryTime) < now);
      const expiredByViews = uniqueExpiredFiles.filter(f => f.viewsRemaining <= 0);
      
      console.log(`\n📅 Files expired by time: ${expiredByTime.length}`);
      console.log(`👁️  Files expired by view limit: ${expiredByViews.length}`);

      console.log(`\n🗑️  Total unique files to delete: ${uniqueExpiredFiles.length}`);

      // Delete each expired file
      for (const file of uniqueExpiredFiles) {
        try {
          console.log(`\n  Processing file ID ${file.id}: ${file.originalName}`);
          console.log(`    - Expiry: ${file.expiryTime.toISOString()}`);
          console.log(`    - Views remaining: ${file.viewsRemaining}`);
          console.log(`    - File path: ${file.filePath}`);

          // Delete file from filesystem (Requirement 8.4)
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
            filesystemDeleted++;
            console.log(`    ✓ Deleted from filesystem`);
          } else {
            console.log(`    ⚠️  File not found on filesystem (may have been deleted already)`);
          }

          // Remove database record (Requirement 8.5)
          await file.destroy();
          databaseDeleted++;
          console.log(`    ✓ Removed from database`);

          totalDeleted++;
        } catch (error) {
          errors++;
          console.error(`    ✗ Error deleting file ID ${file.id}:`, error.message);
          // Continue with next file even if one fails
        }
      }

      // Log cleanup summary
      const duration = Date.now() - startTime;
      console.log('\n========================================');
      console.log('📊 Cleanup Summary:');
      console.log(`  - Total files processed: ${uniqueExpiredFiles.length}`);
      console.log(`  - Successfully deleted: ${totalDeleted}`);
      console.log(`  - Filesystem deletions: ${filesystemDeleted}`);
      console.log(`  - Database deletions: ${databaseDeleted}`);
      console.log(`  - Errors: ${errors}`);
      console.log(`  - Duration: ${duration}ms`);
      console.log(`  - Completed at: ${new Date().toISOString()}`);
      console.log('========================================\n');

      // Log to analytics service
      analyticsService.logCleanup(totalDeleted, 0, duration);

    } catch (error) {
      console.error('✗ Cleanup job failed:', error);
      console.error(error.stack);
      analyticsService.logError('cleanup', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  async triggerManualCleanup() {
    console.log('🔧 Manual cleanup triggered');
    await this.runCleanup();
  }
}

// Export singleton instance
const cleanupService = new CleanupService();
module.exports = cleanupService;
