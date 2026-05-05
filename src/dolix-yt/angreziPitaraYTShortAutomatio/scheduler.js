const cron = require('node-cron');
const YouTubeAutomation = require('./app');
const LongVideoAutomation = require('./longApp');
const config = require('./config');

const shortsAutomation = new YouTubeAutomation();
const longAutomation = new LongVideoAutomation();

console.log('🕒 YouTube Content Scheduler Started...');
console.log(`📅 Shorts Schedule: ${config.automation.uploadSchedule.join(', ')}`);
console.log(`📅 Long Video Schedule: ${config.automation.longVideoSchedule?.join(', ') || 'None'}`);

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

// 2. Schedule Long Videos (Mega Quizzes)
if (config.automation.longVideoSchedule) {
  config.automation.longVideoSchedule.forEach(time => {
    const [hour, minute] = time.split(':');
    const cronPattern = `${minute} ${hour} * * *`;

    cron.schedule(cronPattern, async () => {
      console.log(`\n🔔 [MegaQuiz] Scheduled Trigger [${time}]: Starting 10-Quiz video generation...`);
      try {
        await longAutomation.createMegaQuiz(10);
      } catch (err) {
        console.error(`❌ [MegaQuiz] Task failed for ${time}:`, err.message);
      }
    });
    console.log(`✅ MegaQuiz task scheduled for ${time}`);
  });
}

// Run immediately on start if requested
if (process.argv.includes('--now')) {
  console.log('🚀 Running initial Shorts automation now...');
  shortsAutomation.runSingle().catch(console.error);
}
if (process.argv.includes('--long-now')) {
  console.log('🚀 Running initial MegaQuiz automation now...');
  longAutomation.createMegaQuiz(10).catch(console.error);
}
