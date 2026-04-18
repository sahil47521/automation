require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

bot.getMe().then((me) => {
    console.log('✅ Success! The bot is connected.');
    console.log(`Bot Name: ${me.first_name}`);
    console.log(`Username: @${me.username}`);
    console.log('\nTo see a quiz in action:');
    console.log('1. Go to Telegram and message @' + me.username);
    console.log('2. Type /quiz');
    process.exit(0);
}).catch((err) => {
    console.error('❌ Error connecting to Telegram:', err.message);
    process.exit(1);
});
