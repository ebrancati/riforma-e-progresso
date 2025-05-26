// Global games storage
const games = {};

function createGame(chatId, player1) {
    console.log(`Creating new game in chat ${chatId} with player1:`, player1);
    
    games[chatId] = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        player1: {
            id: player1.id,
            first_name: player1.first_name || 'Player 1',
            username: player1.username,
            symbol: 'X'
        },
        player2: null,
        status: 'waiting_for_player',
        lastMessageId: null,
        startMessageId: null
    };
    
    return games[chatId];
}

function addPlayer2(chatId, player) {
    const game = games[chatId];
    if (!game) return { success: false, message: 'Nessuna partita trovata' };
    
    if (game.status !== 'waiting_for_player')
        return { success: false, message: 'La partita è già in corso o terminata' };
    
    if (game.player1.id === player.id)
        return { success: false, message: 'Non puoi giocare contro te stesso' };
    
    game.player2 = {
        id: player.id,
        first_name: player.first_name || 'Player 2',
        username: player.username,
        symbol: 'O'
    };
    
    game.status = 'in_progress';

    return {success: true, game };
}

function makeMove(chatId, userId, position) {
    const game = games[chatId];
    
    if (!game) return { success: false, message: 'Nessuna partita attiva' };
    
    if (game.status !== 'in_progress')
        return { success: false, message: 'Partita non in corso' };
    
    // Check player
    let playerSymbol;
    if (userId === game.player1.id) {
        playerSymbol = game.player1.symbol;
    } else if (game.player2 && userId === game.player2.id) {
        playerSymbol = game.player2.symbol;
    } else {
        return { success: false, message: 'Non fai parte di questa partita' };
    }
    
    // Check turn
    if (game.currentPlayer !== playerSymbol) {
        return { success: false, message: 'Non è il tuo turno' };
    }
    
    // Check position
    if (position < 0 || position > 8 || game.board[position] !== null) {
        return { success: false, message: 'Mossa non valida' };
    }
    
    // Make move
    game.board[position] = playerSymbol;
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    
    const winner = checkWinner(game.board);
    if (winner) {
        game.status = 'finished';
    }
    
    return { success: true, game, winner, playerSymbol };
}

function checkWinner(board) {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (board[a] && board[a] === board[b] && board[a] === board[c])
            return board[a];
    }

    if (!board.includes(null)) return 'draw';

    return null;
}

function getGame(chatId) {
    return games[chatId];
}

function removeGame(chatId) {
    delete games[chatId];
}

// Check if game exists
function hasGame(chatId) {
    return Boolean(games[chatId]);
}

module.exports = {
    createGame,
    addPlayer2,
    makeMove,
    checkWinner,
    getGame,
    removeGame,
    hasGame
};