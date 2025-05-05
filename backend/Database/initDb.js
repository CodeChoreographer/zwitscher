const db = require('./db');

async function initDb() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                                                 id INT AUTO_INCREMENT PRIMARY KEY,
                                                 username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    username VARCHAR(255) NOT NULL,
                text TEXT NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
        `);

        console.log("✅ Tabellen erfolgreich erstellt");
    } catch (err) {
        console.error("❌ Fehler beim Initialisieren der Datenbank:", err.message);
    }
}

module.exports = initDb;
