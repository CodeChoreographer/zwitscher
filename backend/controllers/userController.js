const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

function isPasswordStrong(password) {
    const regex = /^(?=.*[0-9])(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}

class UserController {
    async register(req, res) {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich.' });

        if (!isPasswordStrong(password))
            return res.status(400).json({ message: 'Passwort zu schwach. Es muss mindestens 8 Zeichen, eine Zahl und ein Sonderzeichen enthalten.' });

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
    }

    async login(req, res) {
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
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);

            if (!user) return res.status(404).json({ message: 'Benutzer nicht gefunden.' });

            res.json(user);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Fehler beim Laden des Profils.' });
        }
    }

    async updateUsername(req, res) {
        const { newUsername } = req.body;
        const userId = req.user.userId;

        if (!newUsername || !newUsername.trim())
            return res.status(400).json({ message: 'Neuer Benutzername ist erforderlich.' });

        try {
            const [[user]] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
            const oldUsername = user.username;

            await db.query('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);


            const { io } = require('../index');
            io.emit('chatMessage', {
                userId: -1,
                text: `ℹ️ ${oldUsername} heisst jetzt neu ${newUsername}`,
                time: new Date().toISOString()
            });

            io.emit('usernameChanged', {
                userId,
                oldUsername,
                newUsername
            });

            res.json({ message: 'Benutzername aktualisiert.' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).json({ message: 'Benutzername bereits vergeben.' });
            } else {
                console.error(err);
                res.status(500).json({ message: 'Fehler beim Ändern des Benutzernamens.' });
            }
        }
    }


    async changePassword(req, res) {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!oldPassword || !newPassword)
            return res.status(400).json({ message: 'Altes und neues Passwort sind erforderlich.' });

        if (!isPasswordStrong(newPassword))
            return res.status(400).json({ message: 'Neues Passwort ist zu schwach. Es muss mindestens 8 Zeichen, eine Zahl und ein Sonderzeichen enthalten.' });

        try {
            const [[user]] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
            const match = await bcrypt.compare(oldPassword, user.password_hash);

            if (!match)
                return res.status(401).json({ message: 'Altes Passwort ist falsch.' });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

            res.json({ message: 'Passwort erfolgreich geändert.' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Fehler beim Ändern des Passworts.' });
        }
    }



}

module.exports = { UserController };
