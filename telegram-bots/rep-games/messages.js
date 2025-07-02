const { PLAYER_SYMBOLS } = require('./keyboards');

function createWelcomeMessage(user) {
    const firstName = user.first_name   || '';
    const lastName  = user.last_name    || '';
    const username  = user.username ? `@${user.username}` : '';
    
    return `
Ciao ${firstName} ${lastName} ${username}!
Benvenuto nei Club di R.e.P - Riforma e Progresso! 
Io sono Rep-Games, piacere di conoscerti! Grazie a me, in questi Club potrai trovare tanti giochi interattivi da poter svolgere in modalità Single-Player, Multi-player o Co-operativa, con tutti gli altri membri e partecipanti, per sfidarvi all'ultima partita.

Usa il menu per iniziare! 🎮
    `;
}

function createGameStatusMessage(game) {
    const player1Name = game.player1?.first_name || 'Player 1';
    const player2Name = game.player2?.first_name || 'Player 2';
  
    if (game.status === 'waiting_for_player') {
        return `🎮 *Nuova partita di Tic Tac Toe* 🎮\nCreata da ${player1Name}! In attesa di un altro giocatore.`;
    }
  
    if (game.status === 'in_progress') {
        const currentPlayerName = game.currentPlayer === 'X' ? 
        player1Name : player2Name;
        
        return `
🎮 *Tic Tac Toe* 🎮
Giocatore ❌: ${player1Name}
Giocatore ⭕: ${player2Name}
Turno attuale: ${PLAYER_SYMBOLS[game.currentPlayer]} (${currentPlayerName})
        `;
    }
  
    if (game.status === 'finished') {
        const winner = require('./gameLogic').checkWinner(game.board);
        
        if (winner === 'draw') {
            return `
🎮 *Tic Tac Toe* 🎮
Giocatore ❌: ${player1Name}
Giocatore ⭕: ${player2Name}
*Risultato: Pareggio!* 🤝
            `;
        }
        else {
            const winnerName = winner === 'X' ? player1Name : player2Name;
            return `
                🎮 *Tic Tac Toe* 🎮
                Giocatore ❌: ${player1Name}
                Giocatore ⭕: ${player2Name}
                *Vincitore: ${winnerName} ${PLAYER_SYMBOLS[winner]}*
            `;
        }
    }
    
    return 'Stato del gioco non riconosciuto';
}

// Safe reply utility
function safeReply(bot, chatId, text, options = {}, replyToMessageId = null) {
    console.log(`Sending message to chat ID: ${chatId}${replyToMessageId ? ` as reply to ${replyToMessageId}` : ''}`);
    
    if (replyToMessageId) {
        options.reply_to_message_id = replyToMessageId;
    }
    
    return bot.sendMessage(chatId, text, options)
        .then(message => {
            console.log(`Message sent successfully to chat ID: ${chatId}, message ID: ${message.message_id}`);
            return message;
        })
        .catch(error => {
            console.error(`Error sending message to chat ID: ${chatId}:`, error);
            return null;
        });
}

module.exports = {
    createWelcomeMessage,
    createGameStatusMessage,
    safeReply
};