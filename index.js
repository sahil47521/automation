require('dotenv').config();
const config = require('./config');
const { startAngreziPitara } = require('./src/angrezi-pitara-automation');
const http = require('http');

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const CHAT_ID = config.DEFAULT_CHAT_ID;

console.log('🚀 Starting Automation Backend...');

// Initialize Angrezi Pitara Workflow
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
