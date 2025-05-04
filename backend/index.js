const express = require('express');
require('dotenv').config();
const initDb = require('./database/initDb');
const apiRoutes = require('./api/api');

const app = express();
const PORT = 3000;

app.use(express.json());
initDb();

apiRoutes(app);

app.listen(PORT, () => {
    console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
});
