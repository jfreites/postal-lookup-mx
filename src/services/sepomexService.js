const db = require('../db/database');

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

    db.exec('DELETE FROM sepomex');

    const insertStmt = db.prepare(`
      INSERT INTO sepomex (zipcode, neighborhood, municipality, city, state)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
      for (const record of records) {
        insertStmt.run(
          record.zipcode,
          record.neighborhood,
          record.municipality,
          record.city,
          record.state
        );
      }
    });

    const batch = [];
    let totalInserted = 0;

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split('|');
      const record = {
        zipcode: values[headerIndices['d_codigo']] || '',
        neighborhood: values[headerIndices['d_asenta']] || '',
        municipality: values[headerIndices['D_mnpio']] || '',
        city: values[headerIndices['d_ciudad']] || '',
        state: values[headerIndices['d_estado']] || ''
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

  lookup: ({ zipcode, city, state, group: groupBy }) => {
    let query = 'SELECT zipcode, neighborhood, municipality, city, state FROM sepomex WHERE 1=1';
    const params = [];

    if (zipcode) {
      query += ' AND zipcode = ?';
      params.push(zipcode);
    }
    if (city) {
      query += ' AND city = ?';
      params.push(city);
    }
    if (state) {
      query += ' AND state = ?';
      params.push(state);
    }

    query += ' ORDER BY zipcode, neighborhood LIMIT 1000';

    const stmt = db.prepare(query);
    const results = stmt.all(...params);

    if (groupBy) {
      const grouped = {};
      for (const row of results) {
        const key = `${row.zipcode}|${row.city}|${row.state}|${row.municipality}`;
        if (!grouped[key]) {
          grouped[key] = {
            zipcode: row.zipcode,
            city: row.city,
            state: row.state,
            municipality: row.municipality,
            neighborhoods: []
          };
        }
        grouped[key].neighborhoods.push(row.neighborhood);
      }
      return Object.values(grouped);
    }

    return results;
  }
};

module.exports = sepomexService;
