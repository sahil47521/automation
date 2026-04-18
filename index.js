const config = require('./config');
const { startAngreziPitara } = require('./src/angrezi-pitara-automation');

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
    
    // Support for manual post from CLI
    if (isManual) {
        const chatIndex = process.argv.indexOf('--post') + 1;
        const targetChat = process.argv[chatIndex] || CHAT_ID;
        const limit = config.ANGREZI_PITARA.QUESTIONS_PER_RUN || 1;
        
        if (targetChat) {
            console.log(`📡 Manual trigger: Sending ${limit} quiz(zes) to ${targetChat}...`);
            angreziPitara.sendMultiple(targetChat).then(() => {
                console.log('✅ Manual trigger completed. Exiting...');
                process.exit(0);
            });
        }
    }
} else {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing in config.js');
}
