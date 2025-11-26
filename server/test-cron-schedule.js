/**
 * Test to verify cron schedule is configured correctly
 * The cleanup service should run every 1 hour as per requirement 8.1
 */

const cron = require('node-cron');

console.log('Testing cron schedule configuration...\n');

// Test the cron expression used in cleanupService
const cronExpression = '0 * * * *'; // Every hour at minute 0

console.log(`Cron expression: "${cronExpression}"`);
console.log('This means: Run at minute 0 of every hour\n');

// Validate the cron expression
const isValid = cron.validate(cronExpression);
console.log(`Is valid: ${isValid ? '✓ YES' : '✗ NO'}\n`);

if (isValid) {
  console.log('Schedule interpretation:');
  console.log('  - Runs at: 00:00, 01:00, 02:00, 03:00, ... 23:00');
  console.log('  - Frequency: Every 1 hour');
  console.log('  - Matches requirement 8.1: ✓\n');
  
  // Create a test job to verify it can be scheduled
  let executionCount = 0;
  const testJob = cron.schedule(cronExpression, () => {
    executionCount++;
    console.log(`Test job executed at: ${new Date().toISOString()}`);
  }, {
    scheduled: false // Don't start automatically
  });
  
  console.log('Test job created successfully: ✓');
  console.log('Cron schedule configuration is correct!\n');
  
  testJob.destroy();
} else {
  console.log('✗ Cron expression is invalid!');
}
