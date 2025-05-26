const PLAYER_SYMBOLS = {
    X: '❌',
    O: '⭕'
};

function createMainMenu() {
    return {
        inline_keyboard: [
            [
                { text: '🎮 Giochi', callback_data: 'menu_games' }
            ]
        ]
    };
}

function createGamesMenu() {
    return {
        inline_keyboard: [
            [{ text: '🎲 Tris', callback_data: 'tris_game' }],
            [{ text: '↩️ Indietro', callback_data: 'back_to_main' }]
        ]
    };
}

function createGameKeyboard(board) {
    const keyboard = [];
    
    for (let i = 0; i < 3; i++) {
        const row = [];
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            let cellValue = board[index] === null ? "-" : PLAYER_SYMBOLS[board[index]];
            
            row.push({
                text: cellValue,
                callback_data: `move:${index}`
            });
        }
        keyboard.push(row);
    }
    
    keyboard.push([
        { text: '🚪 Esci dal Gioco', callback_data: 'exit_game' }
    ]);
    
    return { inline_keyboard: keyboard };
}

function createGameOverKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '🎮 Gioca ancora', callback_data: 'play_again' }],
            [{ text: '🔙 Torna al menu dei giochi', callback_data: 'menu_games' }]
        ]
    };
}

function createWaitingKeyboard() {
    return { 
        inline_keyboard: [
            [{ text: '🎮 GIOCA', callback_data: 'join' }],
            [{ text: '↩️ Torna al menu dei giochi', callback_data: 'menu_games' }]
        ] 
    };
}

module.exports = {
    PLAYER_SYMBOLS,
    createMainMenu,
    createGamesMenu,
    createGameKeyboard,
    createGameOverKeyboard,
    createWaitingKeyboard
};