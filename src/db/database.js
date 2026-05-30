const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/sepomex.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sepomex (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zipcode TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    municipality TEXT NOT NULL,
    city TEXT,
    state TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_zipcode ON sepomex(zipcode);
  CREATE INDEX IF NOT EXISTS idx_state ON sepomex(state);
  CREATE INDEX IF NOT EXISTS idx_city ON sepomex(city);
`);

module.exports = db;
