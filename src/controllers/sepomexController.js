const path = require('path');
const fs = require('fs');
const { generateUniqueFilename } = require('../utils/fileStorage');
const sepomexService = require('../services/sepomexService');

const uploadDir = path.join(__dirname, '../../uploads');

const sepomexController = {
  import: async (req, res) => {
    try {
      const file = req.file;
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const destination = path.join(uploadDir, uniqueFilename);

      fs.writeFileSync(destination, file.buffer);

      const totalRecords = await sepomexService.importFromFile(file.buffer);

      res.status(201).json({
        success: true,
        filename: uniqueFilename,
        originalName: file.originalname,
        totalRecords
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getByZipcode: async (req, res) => {
    try {
      const { zipcode } = req.params;
      const results = await sepomexService.getByZipcode(zipcode);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getByZipcodeGrouped: async (req, res) => {
    try {
      const { zipcode } = req.params;
      const results = await sepomexService.getByZipcodeGrouped(zipcode);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getCitiesByState: async (req, res) => {
    try {
      const { stateIso } = req.params;
      const cities = await sepomexService.getCitiesByState(stateIso);
      res.status(200).json({ success: true, data: cities });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getPostalCodesByStateAndCity: async (req, res) => {
    try {
      const { stateIso, normalizedCity } = req.params;
      const result = await sepomexService.getPostalCodesByStateAndCity(stateIso, normalizedCity);
      res.status(200).json({
        success: true,
        state: stateIso.toUpperCase(),
        city: result.city,
        postalCodes: result.postalCodes
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = sepomexController;