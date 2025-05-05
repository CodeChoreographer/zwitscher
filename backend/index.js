const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const initDb = require('./database/initDb');
const apiRoutes = require('./api/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST']
    }
});

const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' })) // für lokale Umgebung (später prod.)
app.use(express.json());
initDb();
apiRoutes(app);

io.on('connection', (socket) => {
    console.log('🟢 Neuer Client verbunden: ' + socket.id);

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
