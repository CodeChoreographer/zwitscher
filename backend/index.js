const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const db = require('./database/db');
const initDb = require('./database/initDb');
const apiRoutes = require('./api/api');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST']
    }
});

const PORT = 3000;
const users = new Map();

// Middleware
app.use(cors({ origin: 'http://localhost:4200' })); // anpassen für prod später
app.use(express.json());

// Datenbank und API
initDb();
apiRoutes(app);

// Socket.IO Logik
io.on('connection', async (socket) => {
    console.log('🟢 Neuer Client verbunden: ' + socket.id);

    //  Alte Nachrichten an neu verbundenen Client senden
    socket.emit('loadMessages', await loadMessages());

    //  Benutzer registrieren
    socket.on('registerUser', (username) => {
        users.set(socket.id, username);
        io.emit('activeUsers', Array.from(users.values()));
    });

    //  Nachrichten empfangen und speichern
    socket.on('chatMessage', async (msg) => {
        const { user, text, time } = msg;
        try {
            await db.query(
                'INSERT INTO messages (username, text, timestamp) VALUES (?, ?, ?)',
                [user, text, new Date(time)]
            );
            io.emit('chatMessage', msg);
        } catch (err) {
            console.error('❌ Fehler beim Speichern der Nachricht:', err);
        }
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
});

async function loadMessages() {
    const [rows] = await db.query(`
    SELECT username AS user, text, timestamp AS time 
    FROM messages 
    ORDER BY timestamp ASC
  `);
    return rows;
}

server.listen(PORT, () => {
    console.log(`✅ Backend + Socket.IO läuft auf http://localhost:${PORT}`);
});
