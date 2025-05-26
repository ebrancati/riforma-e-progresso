require('dotenv').config();

module.exports = {
    token: process.env.TOKEN,
    botOptions: {
        polling: true,
        debug: process.env.NODE_ENV === 'development'
    },
    botImagePath: './assets/pfp.jpg'
};