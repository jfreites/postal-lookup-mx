const express = require('express');
const multer = require('multer');
const sepomexController = require('../controllers/sepomexController');
const { validateSubscriberApiKey } = require('../middlewares/auth');
const { checkRateLimit } = require('../middlewares/rateLimiter');
const { validateFileExtension } = require('../middlewares/validateFileExtension');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/import',
  validateSubscriberApiKey,
  checkRateLimit,
  upload.single('file'),
  validateFileExtension,
  sepomexController.import
);

router.get('/postal-codes/:zipcode',
  validateSubscriberApiKey,
  checkRateLimit,
  sepomexController.getByZipcode
);

router.get('/postal-codes/:zipcode/grouped',
  validateSubscriberApiKey,
  checkRateLimit,
  sepomexController.getByZipcodeGrouped
);

module.exports = router;