require('dotenv').config();
const config = require('./config');
const { startAngreziPitara } = require('./src/angrezi-pitara-automation');
const YouTubeAutomation = require('./src/dolix-yt/angreziPitaraYTShortAutomatio/app');
const ytConfig = require('./src/dolix-yt/angreziPitaraYTShortAutomatio/config');
const cron = require('node-cron');
const http = require('http');

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const CHAT_ID = config.DEFAULT_CHAT_ID;

console.log('🚀 Starting Unified Automation Backend...');

// Initialize YouTube Automation
const youtubeAutomation = new YouTubeAutomation();

// Setup YouTube Scheduler (6 times a day)
ytConfig.automation.uploadSchedule.forEach(time => {
    const [hour, minute] = time.split(':');
    cron.schedule(`${minute} ${hour} * * *`, async () => {
        console.log(`\n🔔 [YouTube] Scheduled Trigger [${time}]: Generating Short...`);
        try {
            await youtubeAutomation.runSingle();
        } catch (err) {
            console.error(`❌ [YouTube] Task failed for ${time}:`, err.message);
        }
    });
    console.log(`✅ [YouTube] Scheduled for ${time}`);
});

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
                res.end('✅ YouTube Automation triggered successfully! Check YouTube channel.\n');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`❌ Error in YouTube Automation: ${err.message}\n`);
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
