const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const initDb = require('./database/initDb');
const db = require('./database/db');
const apiRoutes = require('./api/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST']
    }
});

const users = new Map();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
initDb();
apiRoutes(app);

async function loadMessages() {
    const [rows] = await db.query(`
        SELECT users.username AS user, 
               messages.user_id AS userId, 
               messages.text, 
               messages.timestamp AS time
        FROM messages
            JOIN users ON messages.user_id = users.id
        ORDER BY messages.timestamp ASC
    `);
    return rows;
}


io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token fehlt'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zwitschernistcool');
        socket.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('❌ Socket Auth Fehler:', err.message);
        next(new Error('Token ungültig'));
    }
});

io.on('connection', async (socket) => {
    console.log('🟢 Neuer Client verbunden: ' + socket.id);

    const userId = socket.userId;
    if (userId) {
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            users.set(socket.id, user.username);
            io.emit('activeUsers', Array.from(users.values()));
        }
    }

    socket.on('getActiveUser', async () => {
        const userId = socket.userId;
        if (!userId) return;

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            users.set(socket.id, user.username);
            io.emit('activeUsers', Array.from(users.values()));
        }
    });


    socket.on('getMessages', async () => {
        const messages = await loadMessages();
        socket.emit('messages', messages);
    });

    socket.on('chatMessage', async (msg) => {
        const userId = socket.userId;
        if (!userId) return;

        await db.query('INSERT INTO messages (user_id, text) VALUES (?, ?)', [userId, msg.text]);

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        const fullMessage = {
            user: user.username,
            text: msg.text,
            time: new Date().toISOString()
        };

        io.emit('chatMessage', fullMessage);
    });


    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping');
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client getrennt: ' + socket.id);
        users.delete(socket.id);
        io.emit('activeUsers', Array.from(users.values()));
    });

    socket.on('getMyUsername', async () => {
        const userId = socket.userId;
        if (!userId) return;
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            socket.emit('yourUsername', user.username);
        }
    });

});

server.listen(PORT, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${PORT}`);
});

module.exports = { io };

