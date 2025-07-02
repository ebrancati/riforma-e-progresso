## Installazione

### Prerequisiti
- [Node.js](https://nodejs.org/)
- Bot Telegram (creato tramite [@BotFather](https://t.me/BotFather))

### Setup

1. **Clona il repository:**
   ```bash
   git clone https://github.com/ebrancati/riforma-e-progresso.git
   cd riforma-e-progresso
   ```

2. **Naviga nella cartella del progetto:**
   ```bash
   cd telegram-bots/rep-games
   ```

3. **Installa le dipendenze:**
   ```bash
   npm install
   ```

4. **Configura il bot:**
   - Crea un file `.env` nella cartella principale
   - Aggiungi il token del tuo bot:
   ```env
   TOKEN=il_tuo_token_del_bot_qui
   ```

5. **(Opzionale) Aggiungi l'immagine del bot:**
   - Inserisci un'immagine chiamata `pfp.jpg` nella cartella `assets/`

6. **Avvia il bot:**
   ```bash
   npm start
   ```

## 📁 Struttura del Progetto

```
telegram-bots/
└── rep-games/
    ├── assets/
    │   └── pfp.jpg                 
    ├── handlers/
    │   ├── commands.js             # Gestione comandi
    │   └── callbacks.js            # Gestione pulsanti e menu
    ├── config.js                   # Configurazioni del bot
    ├── gameLogic.js                # Logica del gioco Tris
    ├── keyboards.js                # Definizione tastiere inline
    ├── messages.js                 # Formattazione messaggi
    ├── index.js                    # File principale
    ├── package.json                
    ├── .env                        
    ├── .gitignore                  
    └── README.md                   
```

## 🎯 Comandi Disponibili

| Comando | Descrizione |
|---------|-------------|
| `/play` | Mostra il menu |
| `/tris` | Crea una nuova partita di Tic Tac Toe |
| `/join` | Unisciti a una partita esistente |

## 🚀 Avvio Rapido

Dopo aver clonato il repository:

```bash
cd telegram-bots/rep-games
npm install
echo "TOKEN=your_bot_token_here" > .env
npm start
```

---

Creato per il Club di R.e.P - [Riforma e Progresso](https://www.riformaeprogresso.it)

---