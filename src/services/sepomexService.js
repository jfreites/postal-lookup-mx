const { supabase, supabaseAdmin } = require('../db/supabase');
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
  importFromFile: async (fileBuffer) => {
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

    const { data: stateData, error: stateError } = await supabase
      .from('state_mapping')
      .select('state_name, state_iso_code');

    if (stateError) throw stateError;

    const stateMap = stateData.reduce((acc, { state_name, state_iso_code }) => {
      acc[state_name.toLowerCase()] = state_iso_code;
      return acc;
    }, {});

    const { error: deleteError } = await supabase
      .from('sepomex')
      .delete()
      .neq('id', 0);

    if (deleteError) throw deleteError;

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
        const { error: insertError } = await supabase
          .from('sepomex')
          .insert(batch);

        if (insertError) throw insertError;

        totalInserted += batch.length;
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      const { error: insertError } = await supabase
        .from('sepomex')
        .insert(batch);

      if (insertError) throw insertError;

      totalInserted += batch.length;
    }

    return totalInserted;
  },

  getByZipcode: async (zipcode) => {
    const { data, error } = await supabase
      .from('sepomex')
      .select('zipcode, neighborhood, municipality, city, state, state_iso_code')
      .eq('zipcode', zipcode)
      .order('neighborhood')
      .limit(1000);

    if (error) throw error;
    return data || [];
  },

  getByZipcodeGrouped: async (zipcode) => {
    const { data, error } = await supabase
      .from('sepomex')
      .select('zipcode, neighborhood, municipality, city, state, state_iso_code')
      .eq('zipcode', zipcode)
      .order('city')
      .order('municipality')
      .order('neighborhood');

    if (error) throw error;

    const grouped = {};
    for (const row of (data || [])) {
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

  getCitiesByState: async (stateIso) => {
    const stateIsoUpper = stateIso.toUpperCase();
    const { data, error } = await supabase
      .from('sepomex')
      .select('city')
      .eq('state_iso_code', stateIsoUpper)
      .order('city');

    if (error) throw error;
    return (data || []).map(row => row.city);
  },

  getPostalCodesByStateAndCity: async (stateIso, normalizedCity) => {
    const stateIsoUpper = stateIso.toUpperCase();

    const { data: cityData, error: cityError } = await supabase
      .from('sepomex')
      .select('city')
      .eq('normalized_city', normalizedCity)
      .eq('state_iso_code', stateIsoUpper)
      .limit(1)
      .maybeSingle();

    if (cityError) throw cityError;
    if (!cityData) return { city: null, postalCodes: [] };

    const { data, error } = await supabase
      .from('sepomex')
      .select('zipcode, municipality, neighborhood')
      .eq('normalized_city', normalizedCity)
      .eq('state_iso_code', stateIsoUpper)
      .order('zipcode')
      .order('neighborhood');

    if (error) throw error;

    const grouped = {};
    for (const row of (data || [])) {
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
      city: cityData.city,
      postalCodes: Object.values(grouped)
    };
  }
};

module.exports = sepomexService;