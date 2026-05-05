require('dotenv').config();
const config = require('./config');
const { startAngreziPitara } = require('./src/angrezi-pitara-automation');
const YouTubeAutomation = require('./src/dolix-yt/angreziPitaraYTShortAutomatio/app');
const LongVideoAutomation = require('./src/dolix-yt/angreziPitaraYTShortAutomatio/longApp');
const ytConfig = require('./src/dolix-yt/angreziPitaraYTShortAutomatio/config');
const cron = require('node-cron');
const http = require('http');

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const CHAT_ID = config.DEFAULT_CHAT_ID;

console.log('🚀 Starting Unified Automation Backend...');

// Initialize YouTube Automation
const youtubeAutomation = new YouTubeAutomation();
const longAutomation = new LongVideoAutomation();

// Setup YouTube Shorts Scheduler (6 times a day)
ytConfig.automation.uploadSchedule.forEach(time => {
    const [hour, minute] = time.split(':');
    cron.schedule(`${minute} ${hour} * * *`, async () => {
        console.log(`\n🔔 [YouTube Shorts] Scheduled Trigger [${time}]: Generating Short...`);
        try {
            await youtubeAutomation.runSingle();
        } catch (err) {
            console.error(`❌ [YouTube Shorts] Task failed for ${time}:`, err.message);
        }
    });
    console.log(`✅ [YouTube Shorts] Scheduled for ${time}`);
});

// Setup Mega Quiz Scheduler (From config)
if (ytConfig.automation.longVideoSchedule) {
    ytConfig.automation.longVideoSchedule.forEach(time => {
        const [hour, minute] = time.split(':');
        cron.schedule(`${minute} ${hour} * * *`, async () => {
            console.log(`\n🔔 [Mega Quiz] Scheduled Trigger [${time}]: Generating Long Video...`);
            try {
                await longAutomation.createMegaQuiz(10);
            } catch (err) {
                console.error(`❌ [Mega Quiz] Task failed for ${time}:`, err.message);
            }
        });
        console.log(`✅ [Mega Quiz] Scheduled for ${time} daily`);
    });
}

// Initialize Angrezi Pitara Workflow (Telegram)
const isManual = process.argv.includes('--post');

if (TOKEN) {
    const angreziPitara = startAngreziPitara(TOKEN, CHAT_ID, {
        enableAutoPost: !isManual,
        manualOnly: isManual
    });

    // Simple HTTP server for Render deployment
    const PORT = process.env.PORT || 10000;
    http.createServer(async (req, res) => {
        if (req.url === '/quiz') {
            try {
                console.log('📡 Web trigger: /quiz endpoint hit. Sending quizzes...');
                await angreziPitara.sendMultiple(CHAT_ID);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('✅ Quizzes sent successfully!\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error sending quizzes: ${err.message}\n`);
            }
        } else if (req.url === '/yt-test') {
            try {
                console.log('📡 Web trigger: /yt-test endpoint hit. Generating YouTube Short in background...');
                // Trigger in background to avoid timeout
                youtubeAutomation.runSingle().catch(err => console.error(`❌ Background Short failed: ${err.message}`));
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('✅ YouTube Shorts generation started in background! Check logs for progress.\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error triggering YouTube Short: ${err.message}\n`);
            }
        } else if (req.url === '/test-mega') {
            try {
                console.log('📡 Web trigger: /test-mega endpoint hit. Generating Mega Quiz in background...');
                // Trigger in background to avoid timeout
                longAutomation.createMegaQuiz(2).catch(err => console.error(`❌ Background Mega Quiz failed: ${err.message}`));
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('✅ Mega Quiz generation started in background! This will take a few minutes. Check YouTube logs.\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error triggering Mega Quiz: ${err.message}\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Angrezi Pitara Bot is running!\n');
        }
    }).listen(PORT, () => {
        console.log(`🌐 Health check server listening on port ${PORT}`);
    });

    // Support for manual post from CLI
    if (isManual) {
        const chatIndex = process.argv.indexOf('--post') + 1;
        const targetChat = process.argv[chatIndex] || CHAT_ID;
        
        if (targetChat) {
            console.log(`📡 Manual trigger: Sending quizzes to ${targetChat}...`);
            angreziPitara.sendMultiple(targetChat).then(() => {
                console.log('✅ Manual trigger completed. Exiting...');
                process.exit(0);
            });
        }
    }
} else {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing in config.js or .env');
}
