const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_id TEXT,
        token TEXT,
        r3e_user_id TEXT,
        r3e_fullname TEXT,
        verified_at DATETIME,
        PRIMARY KEY (discord_id)
    );
    CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        verify_channel_id TEXT,
        verified_role_id TEXT,
        admin_role_id TEXT,
        how_to_chID TEXT,
        category_id TEXT
    )
`);

module.exports = db;