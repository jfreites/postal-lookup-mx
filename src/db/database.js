const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/sepomex.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS state_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT NOT NULL,
    state_iso_code TEXT NOT NULL UNIQUE
  );

  CREATE INDEX IF NOT EXISTS idx_state_name ON state_mapping(state_name);
  CREATE INDEX IF NOT EXISTS idx_state_iso ON state_mapping(state_iso_code);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sepomex (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zipcode TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    municipality TEXT NOT NULL,
    city TEXT,
    state TEXT NOT NULL,
    state_iso_code TEXT,
    normalized_city TEXT
  );
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_zipcode ON sepomex(zipcode);');
db.exec('CREATE INDEX IF NOT EXISTS idx_state ON sepomex(state);');
db.exec('CREATE INDEX IF NOT EXISTS idx_city ON sepomex(city);');
db.exec('CREATE INDEX IF NOT EXISTS idx_state_iso ON sepomex(state_iso_code);');
db.exec('CREATE INDEX IF NOT EXISTS idx_normalized_city ON sepomex(normalized_city);');

const stateMappings = [
  ['Aguascalientes', 'AGU'],
  ['Baja California', 'BCN'],
  ['Baja California Sur', 'BCS'],
  ['Campeche', 'CAM'],
  ['Chiapas', 'CHP'],
  ['Chihuahua', 'CHH'],
  ['Coahuila', 'COA'],
  ['Colima', 'COL'],
  ['Ciudad de México', 'CMX'],
  ['Durango', 'DUR'],
  ['Guanajuato', 'GTO'],
  ['Guerrero', 'GRO'],
  ['Hidalgo', 'HID'],
  ['Jalisco', 'JAL'],
  ['México', 'MEX'],
  ['Michoacán', 'MIC'],
  ['Morelos', 'MOR'],
  ['Nayarit', 'NAY'],
  ['Nuevo León', 'NLE'],
  ['Oaxaca', 'OAX'],
  ['Puebla', 'PUE'],
  ['Querétaro', 'QRO'],
  ['Quintana Roo', 'ROO'],
  ['San Luis Potosí', 'SLP'],
  ['Sinaloa', 'SIN'],
  ['Sonora', 'SON'],
  ['Tabasco', 'TAB'],
  ['Tamaulipas', 'TAM'],
  ['Tlaxcala', 'TLA'],
  ['Veracruz', 'VER'],
  ['Yucatán', 'YUC'],
  ['Zacatecas', 'ZAC']
];

const insertState = db.prepare('INSERT OR IGNORE INTO state_mapping (state_name, state_iso_code) VALUES (?, ?)');
const checkState = db.prepare('SELECT COUNT(*) as count FROM state_mapping WHERE state_iso_code = ?');

for (const [stateName, stateIso] of stateMappings) {
  const existing = checkState.get(stateIso);
  if (existing.count === 0) {
    insertState.run(stateName, stateIso);
  }
}

module.exports = db;