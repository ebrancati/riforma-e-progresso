const fs = require('fs');
const path = require('path');
const config = require('../config');
const { createWelcomeMessage, createGameStatusMessage, safeReply } = require('../messages');
const { createMainMenu, createWaitingKeyboard } = require('../keyboards');
const { createGame, addPlayer2 } = require('../gameLogic');

// Handle /play command
function handlePlay(bot, msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const username = msg.from.username ? `@${msg.from.username}` : '';
    
    const welcomeMessage = `
Ciao ${firstName} ${lastName} ${username}!
Benvenuto nei Club di R.e.P - Riforma e Progresso! 
Io sono Rep-Games, piacere di conoscerti! Grazie a me, in questi Club potrai trovare tanti giochi interattivi da poter svolgere in modalità Single-Player, Multi-player o Co-operativa, con tutti gli altri membri e partecipanti, per sfidarvi all'ultima partita.

Usa il menu per iniziare! 🎮
    `;

    try {
        const photoPath = path.join(__dirname, '..', 'assets', 'pfp.jpg');
        if (fs.existsSync(photoPath)) {
            bot.sendPhoto(chatId, photoPath, {
                caption: welcomeMessage,
                reply_to_message_id: messageId,
                reply_markup: createMainMenu(),
                filename: 'pfp.jpg'
            }).catch(err => {
                console.error('Error sending photo with message:', err);
                safeReply(bot, chatId, welcomeMessage, { reply_markup: createMainMenu() }, messageId);
            });
        } else {
            console.log('Image file not found:', photoPath);
            safeReply(bot, chatId, welcomeMessage, { reply_markup: createMainMenu() }, messageId);
        }
    } catch (error) {
        console.error('Error trying to send photo with message:', error);
        safeReply(bot, chatId, welcomeMessage, { reply_markup: createMainMenu() }, messageId);
    }
}

// Handle /tris command
function handleTris(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    console.log(`Responding to /tris in chat ${chatId} from user ${userId}`);
    
    const game = createGame(chatId, msg.from);

    safeReply(
        bot,
        chatId,
        `🎮 *Nuova partita di Tic Tac Toe* 🎮\nCreata da ${msg.from.first_name || 'Giocatore 1'}! In attesa di un altro giocatore. Invia /join per partecipare.`,
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🎮 GIOCA', callback_data: 'join' }]] }
        },
        msg.message_id
    ).then(sentMessage => {
        if (sentMessage) {
            game.startMessageId = sentMessage.message_id;
        }
    });
}

// Handle /join command
function handleJoin(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    console.log(`Responding to /join in chat ${chatId} from user ${userId}`);
    
    const result = addPlayer2(chatId, msg.from);
    
    if (!result.success) {
        return safeReply(bot, chatId, result.message, {}, msg.message_id);
    }
    
    const game = result.game;
    console.log('Game state after joining:', JSON.stringify(game, null, 2));
    
    if (game.startMessageId) {
        bot.editMessageText(`${msg.from.first_name || 'Giocatore 2'} si è unito alla partita come Giocatore ⭕! La partita è iniziata.`, {
            chat_id: chatId,
            message_id: game.startMessageId,
            reply_markup: require('../keyboards').createGameKeyboard(game.board)
        }).then(() => {
            // Update with game board
            const message = createGameStatusMessage(game);
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: game.startMessageId,
                parse_mode: 'Markdown',
                reply_markup: require('../keyboards').createGameKeyboard(game.board)
            });
        }).catch(error => {
            console.error('Error updating message after player joined:', error);
        });
    }
}

module.exports = {
    handlePlay,
    handleTris,
    handleJoin
};