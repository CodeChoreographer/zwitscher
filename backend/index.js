const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database/db');
const initDb = require('./database/initDb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());

initDb();

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'Benutzer erfolgreich registriert', userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Benutzername bereits vergeben.' });
        } else {
            console.error(err);
            res.status(500).json({ message: 'Fehler beim Registrieren.' });
        }
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich.' });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0)
            return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch)
            return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'zwitschernistcool',
            { expiresIn: process.env.JWT_EXPIRES_IN || '5h' }
        );

        res.json({ message: 'Login erfolgreich', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Fehler beim Login.' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
});
