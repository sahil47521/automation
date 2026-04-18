const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('../../config');

function startAngreziPitara(token, defaultChatId, options = {}) {
    const { enableAutoPost = true } = options;
    const quizzesDir = path.join(__dirname, 'quizzes');
    const statePath = path.join(__dirname, 'state.json');

    // Load or initialize state
    function loadState() {
        if (fs.existsSync(statePath)) {
            return JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }
        return { lastSentIds: {} }; // { "tenses": 1, "articles": 2 }
    }

    function saveState(state) {
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }

    // Function to load all quizzes from the folder
    function getAllQuizzes() {
        let allQuizzes = [];
        try {
            const files = fs.readdirSync(quizzesDir);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const filePath = path.join(quizzesDir, file);
                    const category = file.replace('.json', '');
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    data.forEach(q => q.category = category);
                    allQuizzes = allQuizzes.concat(data);
                }
            });
        } catch (err) {
            console.error('❌ Error loading quizzes:', err.message);
        }
        return allQuizzes;
    }

    // Create bot instance
    const bot = new TelegramBot(token, { polling: !options.manualOnly });
    console.log('🤖 Angrezi Pitara Bot instance created...');

    // Function to send quizzes from each category
    async function sendQuizzes(chatId) {
        const state = loadState();
        const allQuizzes = getAllQuizzes();
        const categories = [...new Set(allQuizzes.map(q => q.category))];
        
        console.log(`📡 [Angrezi Pitara] Starting quiz run for ${chatId}. Categories: ${categories.join(', ')}`);

        // Send app promo at the start of every run
        const initialPromo = `👋 Welcome to Angrezi Pitara!\n\nBoost your English with our app: ${config.ANGREZI_PITARA.APP_LINK}`;
        try {
            await bot.sendMessage(chatId, initialPromo);
            console.log(`📣 [Angrezi Pitara] Sent initial app promo.`);
        } catch (err) {
            console.error('❌ Error sending initial promo:', err.message);
        }

        for (const category of categories) {
            const categoryQuizzes = allQuizzes.filter(q => q.category === category);
            
            // Sort by ID to ensure sequential order
            categoryQuizzes.sort((a, b) => a.id - b.id);
            
            const lastId = state.lastSentIds[category] || 0;
            
            // Find the next quiz in this category
            let nextQuiz = categoryQuizzes.find(q => q.id > lastId);
            
            // If we reached the end of category, reset to the first one (looping)
            if (!nextQuiz && categoryQuizzes.length > 0) {
                console.log(`🔄 [Angrezi Pitara] Category [${category}] reached the end (last ID: ${lastId}). Looping back to the beginning.`);
                nextQuiz = categoryQuizzes[0];
            }

            if (nextQuiz) {
                try {
                    // Put link back into explanation
                    const finalExplanation = `${nextQuiz.explanation}\n\n📲 App: ${config.ANGREZI_PITARA.APP_LINK}`;

                    await bot.sendPoll(chatId, nextQuiz.question, nextQuiz.options, {
                        is_anonymous: true,
                        type: 'quiz',
                        correct_option_id: nextQuiz.correctIndex,
                        explanation: finalExplanation
                    });
                    
                    // Update state
                    state.lastSentIds[category] = nextQuiz.id;
                    state.totalSent = (state.totalSent || 0) + 1;
                    saveState(state);
                    
                    console.log(`✅ [Angrezi Pitara] Sent [${category}] ID:${nextQuiz.id} to ${chatId}`);

                    // Small delay between posts
                    await new Promise(r => setTimeout(r, 2000));
                    
                } catch (error) {
                    console.error(`❌ [Angrezi Pitara] Error sending quiz [${category}]:`, error.message);
                }
            }
        }
    }

    // Commands (only if polling is enabled)
    if (!options.manualOnly) {
        bot.onText(/\/quiz/, (msg) => sendQuizzes(msg.chat.id));
        bot.onText(/\/start/, (msg) => bot.sendMessage(msg.chat.id, "Welcome! I'm the Angrezi Pitara automation bot. Type /quiz to start."));
    }

    // Auto-post based on cron schedule
    if (defaultChatId && enableAutoPost) {
        const schedule = config.ANGREZI_PITARA.CRON_SCHEDULE;
        console.log(`🕒 [Angrezi Pitara] Auto-post enabled with schedule: ${schedule}`);
        
        cron.schedule(schedule, () => {
            console.log(`⏰ [Angrezi Pitara] Cron trigger: Starting scheduled run...`);
            sendQuizzes(defaultChatId);
        });
    }

    return { bot, sendQuiz: (id) => sendQuizzes(id), sendMultiple: sendQuizzes };
}

module.exports = { startAngreziPitara };
