require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    jwtSecret: process.env.JWT_SECRET || 'zwitschernistcool',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '5h',
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'zwitscher_user',
        password: process.env.DB_PASSWORD || 'secret',
        name: process.env.DB_NAME || 'zwitscher'
    }
};
