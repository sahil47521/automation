# Telegram Quiz Automation Bot

This bot automatically posts English grammar quizzes to your Telegram channel or group.

## Setup

1. **Bot Token**: The token is already configured in the `.env` file.
2. **Quizzes**: You can add more quizzes in `quizzes.json`.
3. **Automatic Posting**:
   - Add the bot as an administrator to your channel.
   - Send `/start` to the bot in private.
   - Forward a message from your channel to the bot to get the **Channel ID**.
   - Add `CHAT_ID=your_channel_id` to your `.env` file.
   - Uncomment the `setInterval` block in `index.js` to enable automatic posting.

## Running the Bot

```bash
npm install
npm start
```

## Commands

- `/start`: Initial setup and help.
- `/quiz`: Manually trigger a random quiz.
- `/setup`: Instructions for channel integration.
