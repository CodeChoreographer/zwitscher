const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token fehlt.' });

    jwt.verify(token, process.env.JWT_SECRET || 'zwitschernistcool', (err, user) => {
        if (err) return res.status(403).json({ message: 'Token ungültig oder abgelaufen.' });

        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
