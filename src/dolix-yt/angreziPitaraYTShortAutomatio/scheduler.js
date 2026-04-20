const cron = require('node-cron');
const YouTubeAutomation = require('./app');
const config = require('./config');

const automation = new YouTubeAutomation();

console.log('🕒 YouTube Shorts Scheduler Started...');
console.log(`📅 Schedule: ${config.automation.uploadSchedule.join(', ')}`);

// Create cron patterns for each time in the schedule
config.automation.uploadSchedule.forEach(time => {
  const [hour, minute] = time.split(':');
  const cronPattern = `${minute} ${hour} * * *`;
  
  cron.schedule(cronPattern, async () => {
    console.log(`\n🔔 Scheduled Trigger [${time}]: Starting YouTube Short generation and upload...`);
    try {
      await automation.runSingle();
    } catch (err) {
      console.error(`❌ Scheduled task failed for ${time}:`, err.message);
    }
  });
  
  console.log(`✅ Task scheduled for ${time} (pattern: ${cronPattern})`);
});

// Run immediately on start if requested
if (process.argv.includes('--now')) {
  console.log('🚀 Running initial automation now...');
  automation.runSingle().catch(console.error);
}
