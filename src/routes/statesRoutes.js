const express = require('express');
const sepomexController = require('../controllers/sepomexController');
const { validateApiKey } = require('../middlewares/auth');

const router = express.Router();

router.get('/states/:stateIso/cities', validateApiKey, sepomexController.getCitiesByState);
router.get('/states/:stateIso/cities/:normalizedCity/postal-codes', validateApiKey, sepomexController.getPostalCodesByStateAndCity);

module.exports = router;