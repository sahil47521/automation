module.exports = {
    // Telegram Bot Settings
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    DEFAULT_CHAT_ID: process.env.DEFAULT_CHAT_ID || "@angreziPitara",

    // Angrezi Pitara Automation Settings
    ANGREZI_PITARA: {
        APP_LINK: "https://play.google.com/store/apps/details?id=com.angrezipitara",
        CRON_SCHEDULE: "0 6,9,12,15,18,21,0 * * *", // Every 3 hours from 6 AM to 12 AM
        QUESTIONS_PER_RUN: 1 // Sending 1 from each JSON category
    }
};
