const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const sepomexController = require('../controllers/sepomexController');
const { validateFileExtension } = require('../middlewares/validateFileExtension');
const { validateApiKey } = require('../middlewares/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const lookupLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_LOOKUP_MAX) || 100,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const importLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_IMPORT_MAX) || 5,
  message: { success: false, error: 'Too many import requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/import', validateApiKey, importLimiter, upload.single('file'), validateFileExtension, sepomexController.import);
router.get('/lookup', validateApiKey, lookupLimiter, sepomexController.lookup);

module.exports = router;