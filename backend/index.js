const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
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

app.use(cors({ origin: 'http://localhost:4200' })) // für lokale Umgebung (später prod.)
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


io.on('connection', async (socket) => {
    console.log('🟢 Neuer Client verbunden: ' + socket.id);

    socket.on('registerUser', (username) => {
        users.set(socket.id, username);
        io.emit('activeUsers', Array.from(users.values()));
    });

    socket.emit('loadMessages', await loadMessages());

    socket.on('disconnect', () => {
        users.delete(socket.id);
        io.emit('activeUsers', Array.from(users.values()));
    });

    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping');
    });

    socket.on('chatMessage', (msg) => {
        console.log('📨 Nachricht empfangen:', msg);
        io.emit('chatMessage', msg);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client getrennt: ' + socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${PORT}`);
});
