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
const userIdToSocket = new Map();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
initDb();
apiRoutes(app);

async function loadMessages() {
    const [rows] = await db.query(`
        SELECT
            messages.user_id AS userId,
            messages.text,
            messages.timestamp AS time,
            users.username
        FROM messages
            JOIN users ON users.id = messages.user_id
        ORDER BY messages.timestamp ASC
    `);
    return rows;
}


function broadcastActiveUsers() {
    const activeUsersArray = Array.from(users.entries())
        .map(([socketId, username]) => {
            const socket = io.sockets.sockets.get(socketId);
            return {
                id: socket?.userId ?? null,
                username
            };
        })
        .filter(user => user.id !== null);

    const activeUserObjects = Array.from(users.entries()).map(([socketId, username]) => {
        const userSocket = io.sockets.sockets.get(socketId);
        const userId = userSocket?.userId;
        return userId ? { id: userId, username } : null;
    }).filter(Boolean);

    io.emit('activeUsers', activeUserObjects);
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
        const oldSocketId = userIdToSocket.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
            io.sockets.sockets.get(oldSocketId)?.disconnect();
        }

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            users.set(socket.id, user.username);
            userIdToSocket.set(userId, socket.id);
            broadcastActiveUsers();
        }
    }


    socket.on('getActiveUser', async () => {
        const userId = socket.userId;
        if (!userId) return;

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            users.set(socket.id, user.username);
            userIdToSocket.set(userId, socket.id);
            broadcastActiveUsers();
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
            userId: userId,
            text: msg.text,
            time: new Date().toISOString(),
            username: user.username
        };

        io.emit('chatMessage', fullMessage);
    });

    socket.on('joinPrivateRoom', (roomName) => {
        socket.join(roomName);
        console.log(`👥 ${users.get(socket.id)} ist dem privaten Raum "${roomName}" beigetreten.`);
    });

    socket.on('privateMessage', (msg) => {
        const { room, user, text, time } = msg;
        if (!room || !text || !user) return;

        io.to(room).emit('privateMessage', { room, user, text, time });
    });

    socket.on('privateChatRequest', async ({ fromId, toId, room }) => {
        console.log('[🔔] PrivateChatRequest empfangen:', { fromId, toId, room });

        const targetSocketId = userIdToSocket.get(toId);
        console.log('[🔍] Ziel-Socket-ID:', targetSocketId);

        if (!targetSocketId) {
            console.warn(`⚠️ Kein Socket gefunden für userId: ${toId}`);
            return;
        }

        try {
            const [[fromUser]] = await db.query('SELECT username FROM users WHERE id = ?', [fromId]);
            console.log(`[📨] Sende Anfrage an ${toId} (${targetSocketId}) von ${fromUser.username}`);

            io.to(targetSocketId).emit('incomingPrivateChatRequest', {
                fromId,
                fromUsername: fromUser.username,
                room
            });
        } catch (err) {
            console.error('❌ Fehler beim Verarbeiten von privateChatRequest:', err);
        }
    });


    socket.on('privateChatResponse', async ({ fromId, toId, room, accepted }) => {
        const targetSocketId = userIdToSocket.get(toId);
        const fromSocketId = userIdToSocket.get(fromId);

        if (!targetSocketId || !fromSocketId) return;

        const [[fromUser]] = await db.query('SELECT username FROM users WHERE id = ?', [fromId]);

        io.to(fromSocketId).emit('chatMessage', {
            userId: -1,
            text: accepted
                ? `✅ ${fromUser.username} hat deine Anfrage angenommen.`
                : `❌ ${fromUser.username} hat deine Anfrage abgelehnt – sei nicht so aufdringlich.`,
            time: new Date().toISOString()
        });

        io.to(targetSocketId).emit('privateChatResponse', { fromId, room, accepted });
    });

    socket.on('typing', async (userId) => {
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            socket.broadcast.emit('typing', user.username);
        }
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping');
    });

    socket.on('usernameChanged', ({ userId, newUsername }) => {
        const socketId = userIdToSocket.get(userId);
        if (socketId) {
            users.set(socketId, newUsername);
        }
        broadcastActiveUsers();
    });

    socket.on('getMyUsername', async () => {
        const userId = socket.userId;
        if (!userId) return;
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) {
            socket.emit('yourUsername', user.username);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client getrennt: ' + socket.id);
        const username = users.get(socket.id);
        users.delete(socket.id);
        userIdToSocket.delete(socket.userId);
        broadcastActiveUsers();
    });


});

server.listen(PORT, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${PORT}`);
});

module.exports = { io };
