const cron = require('node-cron');
const YouTubeAutomation = require('./app');
const config = require('./config');

const shortsAutomation = new YouTubeAutomation();

console.log('🕒 YouTube Content Scheduler Started...');
console.log(`📅 Shorts Schedule: ${config.automation.uploadSchedule.join(', ')}`);

// 1. Schedule Shorts
config.automation.uploadSchedule.forEach(time => {
  const [hour, minute] = time.split(':');
  const cronPattern = `${minute} ${hour} * * *`;
  
  cron.schedule(cronPattern, async () => {
    console.log(`\n🔔 [Shorts] Scheduled Trigger [${time}]: Starting generation...`);
    try {
      await shortsAutomation.runSingle();
    } catch (err) {
      console.error(`❌ [Shorts] Task failed for ${time}:`, err.message);
    }
  });
  console.log(`✅ Shorts task scheduled for ${time}`);
});

// Run immediately on start if requested
if (process.argv.includes('--now')) {
  console.log('🚀 Running initial Shorts automation now...');
  shortsAutomation.runSingle().catch(console.error);
}
