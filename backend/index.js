const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
const userIdToSockets = new Map(); // userId -> Set(socketIds)
const roomMap = new Map(); // roomId -> { userA, userB }
const socketToRooms = new Map(); // socketId -> Set of joined rooms
const allowedPrivateRooms = new Set(); // Gültige private Räume

const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
initDb();
apiRoutes(app);

function generateRoomId() {
    return crypto.randomBytes(4).toString('hex');
}

async function loadMessages() {
    const [rows] = await db.query(`
        SELECT messages.user_id AS userId, messages.text, messages.timestamp AS time, users.username
        FROM messages JOIN users ON users.id = messages.user_id
        ORDER BY messages.timestamp ASC
    `);
    return rows;
}

function broadcastActiveUsers() {
    const activeUsers = [];
    for (const [userId, sockets] of userIdToSockets.entries()) {
        const socketId = Array.from(sockets)[0];
        const username = users.get(socketId);
        if (username) activeUsers.push({ id: userId, username });
    }
    io.emit('activeUsers', activeUsers);
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
    console.log("🟢 Neuer Client verbunden " + socket.id);
    const userId = socket.userId;

    if (userId) {
        let sockets = userIdToSockets.get(userId) || new Set();
        sockets.add(socket.id);
        userIdToSockets.set(userId, sockets);

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) users.set(socket.id, user.username);

        broadcastActiveUsers();
    }

    socket.on('getActiveUser', async () => {
        const userId = socket.userId;
        if (!userId) return;
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) users.set(socket.id, user.username);
        broadcastActiveUsers();
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
        io.emit('chatMessage', {
            userId, text: msg.text, time: new Date().toISOString(), username: user.username
        });
    });

    socket.on('privateChatRequest', async ({ fromId, toId }) => {
        const room = generateRoomId();
        roomMap.set(room, { userA: fromId, userB: toId });

        const targetSockets = userIdToSockets.get(toId);
        if (!targetSockets || targetSockets.size === 0) return;

        const [[fromUser]] = await db.query('SELECT username FROM users WHERE id = ?', [fromId]);

        for (const socketId of targetSockets) {
            io.to(socketId).emit('incomingPrivateChatRequest', {
                fromId,
                fromUsername: fromUser.username,
                room
            });
        }
    });

    socket.on('privateChatResponse', async ({ fromId, toId, room, accepted }) => {
        const toSockets = userIdToSockets.get(toId);
        const fromSockets = userIdToSockets.get(fromId);
        if (!toSockets || !fromSockets) return;

        for (const sid of toSockets) {
            if (accepted) {
                io.to(sid).emit('navigateToPrivateChat', { room });
            } else {
                io.to(sid).emit('privateChatRejected');
            }
        }

        for (const sid of fromSockets) {
            io.to(sid).emit('privateChatResponse', { fromId, room, accepted });
        }
    });

    socket.on('joinPrivateRoom', async (roomName) => {
        const userId = socket.userId;
        const access = roomMap.get(roomName);
        if (!access || (userId !== access.userA && userId !== access.userB)) {
            socket.emit('unauthorizedRoom');
            return;
        }

        socket.join(roomName);
        console.log(`👥 ${users.get(socket.id)} ist dem privaten Raum "${roomName}" beigetreten.`);

        if (!socketToRooms.has(socket.id)) socketToRooms.set(socket.id, new Set());
        socketToRooms.get(socket.id).add(roomName);


        const clients = await io.in(roomName).fetchSockets();
        if (clients.length === 2) {
            io.to(roomName).emit('chatMessage', {
                userId: -1,
                text: '🕊️ Alles was hier gezwitschert wird, verfliegt nach dem Verlassen des Chats wieder.',
                time: new Date().toISOString()
            });
        }
    });

    socket.on('privateMessage', async ({ room, text }) => {
        const userId = socket.userId;
        const access = roomMap.get(room);
        if (!access || (userId !== access.userA && userId !== access.userB)) return;

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        io.to(room).emit('privateMessage', {
            room, userId, username: user.username, text, time: new Date().toISOString()
        });
    });

    socket.on('typing', async (data) => {
        if (typeof data === 'object' && data.room) {
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [data.userId]);
            if (user) {
                socket.to(data.room).emit('typing', user.username);
            }
        } else {
            const userId = typeof data === 'number' ? data : socket.userId;
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
            if (user) {
                socket.broadcast.emit('typing', user.username);
            }
        }
    });


    socket.on('stopTyping', (room) => {
        if (room) {
            socket.to(room).emit('stopTyping');
        } else {
            socket.broadcast.emit('stopTyping');
        }
    });


    socket.on('usernameChanged', ({ userId, newUsername }) => {
        const sockets = userIdToSockets.get(userId);
        if (sockets) for (const sid of sockets) users.set(sid, newUsername);
        broadcastActiveUsers();
    });

    socket.on('getMyUsername', async () => {
        const userId = socket.userId;
        if (!userId) return;
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) socket.emit('yourUsername', user.username);
    });

    socket.on('disconnect', async () => {
        console.log("🔴 Client " + socket.id + " getrennt");

        const userId = socket.userId;
        const username = users.get(socket.id);
        users.delete(socket.id);

        const sockets = userIdToSockets.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                userIdToSockets.delete(userId);
            }
        }
        const rooms = socketToRooms.get(socket.id) || new Set();
        for (const room of rooms) {
            const remainingClients = (await io.in(room).fetchSockets()).filter(s => s.id !== socket.id);

            if (remainingClients.length > 0) {
                io.to(room).emit('chatMessage', {
                    userId: -1,
                    username: 'System',
                    text: `🚪 ${username} ist davongeflogen. Der Chat wird geschlossen.`,
                    time: new Date().toISOString()
                });

                io.to(room).emit('privateChatEnded');
            }

            roomMap.delete(room);
            console.log(`🧹 Raum "${room}" entfernt.`);
        }

        socketToRooms.delete(socket.id);
        broadcastActiveUsers();
    });


});

server.listen(PORT, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${PORT}`);
});

module.exports = { io };
