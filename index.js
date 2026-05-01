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

// Setup Mega Quiz Scheduler (Once a day at 8:00 PM)
cron.schedule('0 20 * * *', async () => {
    console.log(`\n🔔 [Mega Quiz] Scheduled Trigger [20:00]: Generating Long Video...`);
    try {
        await longAutomation.createMegaQuiz(10); // 10 quizzes for the full video
    } catch (err) {
        console.error(`❌ [Mega Quiz] Task failed:`, err.message);
    }
});
console.log(`✅ [Mega Quiz] Scheduled for 20:00 daily`);

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
                console.log('📡 Web trigger: /yt-test endpoint hit. Generating YouTube Short...');
                await youtubeAutomation.runSingle();
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('✅ YouTube Shorts Automation triggered successfully!\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error in YouTube Shorts Automation: ${err.message}\n`);
            }
        } else if (req.url === '/test-mega') {
            try {
                console.log('📡 Web trigger: /test-mega endpoint hit. Generating Mega Quiz...');
                // Triggering a small mega quiz (2 items) for test
                await longAutomation.createMegaQuiz(2);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('✅ Mega Quiz generation started successfully! Check your YouTube channel or long-videos folder.\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error in Mega Quiz Automation: ${err.message}\n`);
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
