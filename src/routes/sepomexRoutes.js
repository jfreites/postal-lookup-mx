const express = require('express');
const multer = require('multer');
const sepomexController = require('../controllers/sepomexController');
const { validateFileExtension } = require('../middlewares/validateFileExtension');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/import', upload.single('file'), validateFileExtension, sepomexController.import);
router.get('/lookup', sepomexController.lookup);

module.exports = router;
