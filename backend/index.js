const config = require('./config');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const botController = require('./controllers/aiBotController');
const initDb = require('./database/initDb');
const db = require('./database/db');
const apiRoutes = require('./api/api');
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
    console.log('📁 Upload-Ordner erstellt');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST']
    }
});

// Sicherheit & CORS
app.use(cors({
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true
}));
app.use(express.json());
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// Statische Uploads bereitstellen
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', config.frontendUrl);
    }
}));

initDb();
apiRoutes(app);

// Multer-Konfiguration
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'uploads/'),
    filename: (_, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Dateityp nicht erlaubt.'));
    }
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    const url = `${config.uploadHost}/uploads/${req.file.filename}`;
    res.json({ url, originalName: req.file.originalname });
});

// Hilfsfunktionen
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
        const username = users.get([...sockets][0]);
        if (username) activeUsers.push({ id: userId, username });
    }
    io.emit('activeUsers', activeUsers);
}

function handlePrivateChatEnd(room, username, reason = 'hat den Privatchat verlassen') {
    io.to(room).emit('chatMessage', {
        userId: -1,
        username: 'System',
        text: `🚪 ${username} ${reason}. Der Chat wird geschlossen.`,
        time: new Date().toISOString()
    });

    io.to(room).emit('privateChatEnded');
    roomMap.delete(room);
}

// Datenstrukturen
const users = new Map();
const userIdToSockets = new Map();
const roomMap = new Map();
const socketToRooms = new Map();

const BOT_USER_ID = -2;
const BOT_NAME = '🤖 ZwitscherVogel 🐤';

// Authentifizierung
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token fehlt'));

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('❌ Socket Auth Fehler:', err.message);
        next(new Error('Token ungültig'));
    }
});

// Socket.IO Events
io.on('connection', async (socket) => {
    const userId = socket.userId;

    if (userId) {
        const sockets = userIdToSockets.get(userId) || new Set();
        sockets.add(socket.id);
        userIdToSockets.set(userId, sockets);

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (user) users.set(socket.id, user.username);

        broadcastActiveUsers();
    }

    socket.on('getActiveUser', async () => {
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [socket.userId]);
        if (user) users.set(socket.id, user.username);
        broadcastActiveUsers();
    });

    socket.on('getMessages', async () => {
        socket.emit('messages', await loadMessages());
    });

    socket.on('chatMessage', async (msg) => {
        await db.query('INSERT INTO messages (user_id, text) VALUES (?, ?)', [socket.userId, msg.text]);
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [socket.userId]);
        io.emit('chatMessage', {
            userId: socket.userId,
            text: msg.text,
            time: new Date().toISOString(),
            username: user.username
        });
    });

    socket.on('privateChatRequest', async ({ fromId, toId, room }) => {
        if (!room) room = generateRoomId();
        roomMap.set(room, { userA: fromId, userB: toId, greeted: false });

        if (toId === BOT_USER_ID) {
            const sockets = userIdToSockets.get(fromId);
            if (sockets) sockets.forEach(sid => io.to(sid).emit('navigateToPrivateChat', { room }));
            return;
        }

        const [[fromUser]] = await db.query('SELECT username FROM users WHERE id = ?', [fromId]);
        const sockets = userIdToSockets.get(toId);
        if (!sockets) return;

        for (const sid of sockets) {
            io.to(sid).emit('incomingPrivateChatRequest', {
                fromId,
                fromUsername: fromUser.username,
                room
            });
        }
    });

    socket.on('privateChatResponse', ({ fromId, toId, room, accepted }) => {
        const toSockets = userIdToSockets.get(toId);
        const fromSockets = userIdToSockets.get(fromId);
        if (!toSockets || !fromSockets) return;

        const event = accepted ? 'navigateToPrivateChat' : 'privateChatRejected';
        [...toSockets, ...fromSockets].forEach(sid => io.to(sid).emit(event, { room }));
    });

    socket.on('joinPrivateRoom', async (roomName) => {
        const access = roomMap.get(roomName);
        if (!access || ![access.userA, access.userB].includes(socket.userId)) {
            return socket.emit('unauthorizedRoom');
        }

        socket.join(roomName);
        if (!socketToRooms.has(socket.id)) socketToRooms.set(socket.id, new Set());
        socketToRooms.get(socket.id).add(roomName);

        const clients = await io.in(roomName).fetchSockets();
        if (clients.length === 2 && !access.greeted) {
            io.to(roomName).emit('chatMessage', {
                userId: -1,
                text: '🕊️ Alles was hier gezwitschert wird, verfliegt nach dem Verlassen des Chats wieder.',
                time: new Date().toISOString()
            });
            access.greeted = true;
        }
    });

    socket.on('privateMessage', async ({ room, text }) => {
        const access = roomMap.get(room);
        if (!access || ![access.userA, access.userB].includes(socket.userId)) return;

        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [socket.userId]);
        io.to(room).emit('privateMessage', {
            room,
            userId: socket.userId,
            username: user.username,
            text,
            time: new Date().toISOString()
        });

        const otherUserId = socket.userId === access.userA ? access.userB : access.userA;
        if (otherUserId === BOT_USER_ID) {
            const botReply = await botController.getBotReply(text);
            io.to(room).emit('privateMessage', {
                room,
                userId: BOT_USER_ID,
                username: BOT_NAME,
                text: botReply,
                time: new Date().toISOString()
            });
        }
    });

    socket.on('privateChatEnded', (room) => {
        const username = users.get(socket.id) || 'Unbekannt';
        handlePrivateChatEnd(room, username, 'hat den Privatchat verlassen');
    });

    socket.on('typing', async (data) => {
        if (typeof data === 'object' && data.room) {
            // Privatchat
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [data.userId]);
            if (user) socket.to(data.room).emit('typing', user.username);
        } else if (typeof data === 'object' && data.userId) {
            // Öffentlicher Chat – basierend auf userId
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [data.userId]);
            if (user) socket.broadcast.emit('typing', user.username);
        }
    });


    socket.on('stopTyping', (room) => {
        if (room) {
            socket.to(room).emit('stopTyping'); // Privatchat
        } else {
            socket.broadcast.emit('stopTyping'); // Öffentlich
        }
    });


    socket.on('usernameChanged', ({ userId, newUsername }) => {
        const sockets = userIdToSockets.get(userId);
        if (sockets) for (const sid of sockets) users.set(sid, newUsername);
        broadcastActiveUsers();
    });

    socket.on('getMyUsername', async () => {
        const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [socket.userId]);
        if (user) socket.emit('yourUsername', user.username);
    });

    socket.on('disconnect', async () => {
        const username = users.get(socket.id) || 'Unbekannt';
        users.delete(socket.id);

        const sockets = userIdToSockets.get(socket.userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) userIdToSockets.delete(socket.userId);
        }

        const rooms = socketToRooms.get(socket.id) || new Set();
        for (const room of rooms) {
            const clients = (await io.in(room).fetchSockets()).filter(s => s.id !== socket.id);
            const access = roomMap.get(room);

            if (access && (access.userA === BOT_USER_ID || access.userB === BOT_USER_ID)) {
                roomMap.delete(room);
                continue;
            }

            if (clients.length > 0) {
                handlePrivateChatEnd(room, username, 'hat sich abgemeldet');
            }
        }

        socketToRooms.delete(socket.id);
        broadcastActiveUsers();
    });
});

server.listen(config.port, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${config.port}`);
    console.log("✅ Frontend läuft auf http://localhost:4200 ");
});

module.exports = { io };
