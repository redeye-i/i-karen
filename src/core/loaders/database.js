const mongoose = require("mongoose");
const Sql = require("better-sqlite3");
const { database } = require("quickmongo");
const { Destroyer } = require("destroyer-fast-cache");
const path = require("path");

function db(name) {
    return path.join(process.cwd(), "database", name);
}

async function initSQL(client) {
    client.logger.info("Connecting → SQL");

    client.warn = new Sql(db("warns.db"));
    client.warn.pragma("journal_mode = WAL");
    client.warn.prepare(`
        CREATE TABLE IF NOT EXISTS warnings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId     TEXT,
            userId      TEXT,
            reason      TEXT,
            moderatorId TEXT,
            timestamp   TEXT,
            warnId      TEXT
        )
    `).run();

    client.snipe = new Sql(db("snipe.db"));
    client.snipe.pragma("journal_mode = WAL");
    client.snipe.pragma("synchronous = NORMAL");
    client.snipe.pragma("threads = 4");
    client.snipe.prepare(`
        CREATE TABLE IF NOT EXISTS snipes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId     TEXT,
            channelId   TEXT,
            content     TEXT,
            author      TEXT,
            authorId    TEXT,
            authorAvatar TEXT,
            timestamp   INTEGER,
            imageUrl    TEXT
        )
    `).run();

    const cols = client.snipe.prepare("PRAGMA table_info(snipes)").all().map(c => c.name);
    if (!cols.includes("authorId"))
        client.snipe.prepare("ALTER TABLE snipes ADD COLUMN authorId TEXT DEFAULT NULL").run();
    if (!cols.includes("authorAvatar"))
        client.snipe.prepare("ALTER TABLE snipes ADD COLUMN authorAvatar TEXT DEFAULT NULL").run();

    client.cmd = new Sql(db("cmd.db"));
    client.cmd.pragma("journal_mode = WAL");
    client.cmd.prepare(`
        CREATE TABLE IF NOT EXISTS total_command_count (
            id    INTEGER PRIMARY KEY CHECK (id = 1),
            count INTEGER DEFAULT 0
        )
    `).run();
    client.cmd.prepare("INSERT OR IGNORE INTO total_command_count (id, count) VALUES (1, 0)").run();

    client.logger.success("SQL connected");
}

async function initMongo(client) {
    client.logger.info("Connecting → MongoDB");

    client.db = new database(String(client.config.MONGO_DB));
    await client.db.connect();

    try {
        await mongoose.connect(client.config.MONGO_DB, { maxPoolSize: 500 });
        if (mongoose.connection.readyState === 1) {
            client.logger.success("MongoDB connected");
        } else {
            client.logger.error(`MongoDB not connected (state: ${mongoose.connection.readyState})`);
        }
    } catch (err) {
        client.logger.error(`MongoDB connection failed — ${err?.message ?? err}`);
    }
}

async function initCache(client) {
    client.cache = new Destroyer();
}

module.exports = { initSQL, initMongo, initCache };
