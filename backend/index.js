const express = require('express');
const cors = require('cors');
require('dotenv').config();
const initDb = require('./database/initDb');
const apiRoutes = require('./api/api');

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:4200' })) // für lokale Umgebung (später prod.)
app.use(express.json());

initDb();
apiRoutes(app);

app.listen(PORT, () => {
    console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
});
