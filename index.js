const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { handlePlay, handleTris, handleJoin } = require('./handlers/commands');
const { handleCallback } = require('./handlers/callbacks');

const bot = new TelegramBot(config.token, config.botOptions);

// Command handlers
bot.onText(/\/play/,  (msg) => handlePlay(bot, msg));
bot.onText(/\/tris/,  (msg) => handleTris(bot, msg));
bot.onText(/\/join/,  (msg) => handleJoin(bot, msg));

// Callback handler
bot.on('callback_query', (query) => handleCallback(bot, query));

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Bot is running!');