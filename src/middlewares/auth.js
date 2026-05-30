const API_KEY = process.env.API_KEY;

const validateApiKey = (req, res, next) => {
  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'API key not configured'
    });
  }

  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid or missing API key' });
  }

  next();
};

module.exports = { validateApiKey };