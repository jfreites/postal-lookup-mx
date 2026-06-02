const express = require('express');
const sepomexController = require('../controllers/sepomexController');
const { validateSubscriberApiKey } = require('../middlewares/auth');
const { checkRateLimit } = require('../middlewares/rateLimiter');

const router = express.Router();

router.get('/states/:stateIso/cities',
  validateSubscriberApiKey,
  checkRateLimit,
  sepomexController.getCitiesByState
);

router.get('/states/:stateIso/cities/:normalizedCity/postal-codes',
  validateSubscriberApiKey,
  checkRateLimit,
  sepomexController.getPostalCodesByStateAndCity
);

module.exports = router;