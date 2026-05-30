const db = require('../db/database');
const { normalizeCity } = require('../utils/normalize');

const FIELD_MAP = {
  d_codigo: 'zipcode',
  d_asenta: 'neighborhood',
  d_mnpio: 'municipality',
  d_ciudad: 'city',
  d_estado: 'state'
};

const BATCH_SIZE = 1000;

const sepomexService = {
  importFromFile: (fileBuffer) => {
    const content = fileBuffer.toString('latin1');
    const lines = content.split('\n');

    if (lines.length < 3) {
      throw new Error('File must contain at least header and one data row');
    }

    const headers = lines[1].split('|').map(h => h.trim().toLowerCase());
    const headerIndices = {};
    headers.forEach((h, i) => { headerIndices[h] = i; });

    for (const field of Object.keys(FIELD_MAP)) {
      if (!(field in headerIndices)) {
        throw new Error(`Missing required field in file: ${field}`);
      }
    }

    const stateMap = db.prepare('SELECT state_name, state_iso_code FROM state_mapping').all()
      .reduce((acc, { state_name, state_iso_code }) => {
        acc[state_name.toLowerCase()] = state_iso_code;
        return acc;
      }, {});

    db.exec('DELETE FROM sepomex');

    const insertStmt = db.prepare(`
      INSERT INTO sepomex (zipcode, neighborhood, municipality, city, state, state_iso_code, normalized_city)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
      for (const record of records) {
        insertStmt.run(
          record.zipcode,
          record.neighborhood,
          record.municipality,
          record.city,
          record.state,
          record.state_iso_code,
          record.normalized_city
        );
      }
    });

    const batch = [];
    let totalInserted = 0;

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split('|');
      const state = values[headerIndices['d_estado']] || '';
      const city = values[headerIndices['d_ciudad']] || '';

      const record = {
        zipcode: values[headerIndices['d_codigo']] || '',
        neighborhood: values[headerIndices['d_asenta']] || '',
        municipality: values[headerIndices['d_mnpio']] || '',
        city: city,
        state: state,
        state_iso_code: stateMap[state.toLowerCase()] || null,
        normalized_city: normalizeCity(city)
      };

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        insertMany(batch);
        totalInserted += batch.length;
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      insertMany(batch);
      totalInserted += batch.length;
    }

    return totalInserted;
  },

  getByZipcode: (zipcode) => {
    const stmt = db.prepare(`
      SELECT zipcode, neighborhood, municipality, city, state, state_iso_code
      FROM sepomex
      WHERE zipcode = ?
      ORDER BY neighborhood
      LIMIT 1000
    `);
    return stmt.all(zipcode);
  },

  getByZipcodeGrouped: (zipcode) => {
    const stmt = db.prepare(`
      SELECT zipcode, neighborhood, municipality, city, state, state_iso_code
      FROM sepomex
      WHERE zipcode = ?
      ORDER BY city, municipality, neighborhood
    `);
    const results = stmt.all(zipcode);

    const grouped = {};
    for (const row of results) {
      const key = `${row.zipcode}|${row.city}|${row.state}|${row.municipality}|${row.state_iso_code}`;
      if (!grouped[key]) {
        grouped[key] = {
          zipcode: row.zipcode,
          city: row.city,
          state: row.state,
          stateIso: row.state_iso_code,
          municipality: row.municipality,
          neighborhoods: []
        };
      }
      grouped[key].neighborhoods.push(row.neighborhood);
    }
    return Object.values(grouped);
  },

  getCitiesByState: (stateIso) => {
    const stateIsoUpper = stateIso.toUpperCase();
    const stmt = db.prepare(`
      SELECT DISTINCT city
      FROM sepomex
      WHERE state_iso_code = ?
      ORDER BY city
    `);
    return stmt.all(stateIsoUpper).map(row => row.city);
  },

  getPostalCodesByStateAndCity: (stateIso, normalizedCity) => {
    const stateIsoUpper = stateIso.toUpperCase();

    const cityStmt = db.prepare(`
      SELECT city FROM sepomex WHERE normalized_city = ? AND state_iso_code = ? LIMIT 1
    `);
    const cityRow = cityStmt.get(normalizedCity, stateIsoUpper);
    if (!cityRow) return { city: null, postalCodes: [] };

    const stmt = db.prepare(`
      SELECT zipcode, municipality, neighborhood
      FROM sepomex
      WHERE normalized_city = ? AND state_iso_code = ?
      ORDER BY zipcode, neighborhood
    `);
    const results = stmt.all(normalizedCity, stateIsoUpper);

    const grouped = {};
    for (const row of results) {
      if (!grouped[row.zipcode]) {
        grouped[row.zipcode] = {
          zipcode: row.zipcode,
          municipality: row.municipality,
          neighborhoods: []
        };
      }
      grouped[row.zipcode].neighborhoods.push(row.neighborhood);
    }

    return {
      city: cityRow.city,
      postalCodes: Object.values(grouped)
    };
  }
};

module.exports = sepomexService;