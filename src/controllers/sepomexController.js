const path = require('path');
const fs = require('fs');
const { generateUniqueFilename } = require('../utils/fileStorage');
const sepomexService = require('../services/sepomexService');

const uploadDir = path.join(__dirname, '../../uploads');

const sepomexController = {
  import: (req, res) => {
    try {
      const file = req.file;
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const destination = path.join(uploadDir, uniqueFilename);

      fs.writeFileSync(destination, file.buffer);

      const totalRecords = sepomexService.importFromFile(file.buffer);

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

  lookup: (req, res) => {
    try {
      const { zipcode, city, state, group } = req.query;
      const results = sepomexService.lookup({ zipcode, city, state, group: group === 'true' });

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = sepomexController;
