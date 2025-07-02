const { createGameStatusMessage } = require('../messages');

const { 
    createMainMenu, 
    createGamesMenu, 
    createGameKeyboard, 
    PLAYER_SYMBOLS 
} = require('../keyboards');

const {
    createGame,
    addPlayer2,
    makeMove,
    removeGame
} = require('../gameLogic');

function handleCallback(bot, query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;
    
    console.log(`Callback query received from chat ${chatId}, user ${userId}, data: ${data}`);

    if (data === 'menu_games') {
        if (query.message.photo) {
            bot.editMessageReplyMarkup(createGamesMenu(), {
                chat_id: chatId,
                message_id: messageId
            });
        } else {
            bot.editMessageText('🎮 **Menu Giochi** 🎮\n\nScegli un gioco:', {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createGamesMenu()
            }).catch(error => {
                console.error('Error editing message for menu_games:', error);
            });
        }
        
        bot.answerCallbackQuery(query.id, {
            text: 'Seleziona una modalità di gioco!'
        });
        return;
    }

    if (data === 'back_to_main') {
        if (query.message.photo) {
            bot.editMessageReplyMarkup(createMainMenu(), {
                chat_id: chatId,
                message_id: messageId
            });
        } else {
            const welcomeText = `
🎮 **Menu Principale** 🎮

Benvenuto in Rep-Games! 
Scegli cosa vuoi fare:
            `;

            bot.editMessageText(welcomeText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createMainMenu()
            }).catch(error => {
                console.error('Error editing message for back_to_main:', error);
            });
        }
        
        bot.answerCallbackQuery(query.id, {
            text: 'Tornati al menu principale!'
        });
        return;
    }

    if (data === 'tris_game') {
        const game = createGame(chatId, query.from);
        const gameMessage = `🎮 *Nuova partita di Tic Tac Toe* 🎮\nCreata da ${query.from.first_name || 'Giocatore 1'}! In attesa di un altro giocatore.`;
        
        if (query.message.photo) {
            console.log('Message has photo, sending new message instead of editing');
            
            bot.editMessageReplyMarkup(null, {
                chat_id: chatId,
                message_id: messageId
            }).catch(() => {});

            bot.sendMessage(chatId, gameMessage, {
                parse_mode: 'Markdown',
                reply_to_message_id: messageId,
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🎮 GIOCA', callback_data: 'join' }],
                        [{ text: '↩️ Torna al menu dei giochi', callback_data: 'menu_games' }]
                    ] 
                }
            }).then(sentMessage => {
                if (sentMessage) {
                    game.startMessageId = sentMessage.message_id;
                }
            });
        } else {
            console.log('Message is text only, editing it');
            bot.editMessageText(gameMessage, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🎮 GIOCA', callback_data: 'join' }],
                        [{ text: '↩️ Torna al menu dei giochi', callback_data: 'menu_games' }]
                    ] 
                }
            }).catch(error => {
                console.error('Error updating message for tris_game:', error);
            });
            
            game.startMessageId = messageId;
        }
        
        bot.answerCallbackQuery(query.id, {
            text: 'Hai creato una nuova partita di Tic Tac Toe!'
        });
        return;
    }

    if (data === 'join') {
        const result = addPlayer2(chatId, query.from);
        
        if (!result.success) {
            return bot.answerCallbackQuery(query.id, {
                text: result.message
            });
        }
        
        const game = result.game;
        
        bot.answerCallbackQuery(query.id, {
            text: 'Ti sei unito alla partita!'
        });

        const message = createGameStatusMessage(game);
        bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: createGameKeyboard(game.board)
        }).catch(error => {
            console.error('Error updating message for join:', error);
        });
        
        game.lastMessageId = messageId;
        return;
    }

    if (data.startsWith('move:')) {
        const index = parseInt(data.split(':')[1]);
        const result = makeMove(chatId, userId, index);
        
        if (!result.success) {
            return bot.answerCallbackQuery(query.id, {
                text: result.message
            });
        }

        const { game, winner, playerSymbol } = result;
        let gameText;
        
        if (winner) {
            if (winner === 'draw') {
                gameText = `
🎮 *Tic Tac Toe* 🎮
Giocatore ❌: ${game.player1.first_name}
Giocatore ⭕: ${game.player2.first_name}
*Risultato: Pareggio!* 🤝
                `;
            } else {
                const winnerName = winner === 'X' ? 
                    (game.player1.first_name || 'Giocatore X') : 
                    (game.player2.first_name || 'Giocatore O');
                
                gameText = `
🎮 *Tic Tac Toe* 🎮
Giocatore ❌: ${game.player1.first_name}
Giocatore ⭕: ${game.player2.first_name}
*Vincitore: ${winnerName} ${PLAYER_SYMBOLS[winner]}*
                `;
            }

            const gameOverKeyboard = {
                inline_keyboard: [
                    [{ text: '🎮 Gioca ancora', callback_data: 'play_again' }],
                    [{ text: '🔙 Torna al menu dei giochi', callback_data: 'menu_games' }]
                ]
            };
            
            bot.editMessageText(gameText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: gameOverKeyboard
            });
        } else {
            const message = createGameStatusMessage(game);
            
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createGameKeyboard(game.board)
            });
        }

        bot.answerCallbackQuery(query.id, {
            text: `Hai posizionato ${PLAYER_SYMBOLS[playerSymbol]} nella posizione ${index + 1}`
        });
        return;
    }

    if (data === 'play_again') {
        const game = createGame(chatId, query.from);
        
        bot.answerCallbackQuery(query.id, {
            text: 'Nuova partita creata!'
        });

        bot.editMessageText(`🎮 *Nuova partita di Tic Tac Toe* 🎮\nCreata da ${query.from.first_name || 'Giocatore 1'}! In attesa di un altro giocatore.`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { 
                inline_keyboard: [
                    [{ text: '🎮 GIOCA', callback_data: 'join' }],
                    [{ text: '↩️ Torna al menu dei giochi', callback_data: 'menu_games' }]
                ] 
            }
        });
        
        game.startMessageId = messageId;
        return;
    }

    if (data === 'exit_game') {
        removeGame(chatId);
        
        bot.answerCallbackQuery(query.id, {
            text: 'Sei uscito dalla partita'
        });
        
        bot.editMessageText('🎮 **Menu Giochi** 🎮\n\nScegli un gioco:', {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: createGamesMenu()
        });
        return;
    }
}

module.exports = {
    handleCallback
};