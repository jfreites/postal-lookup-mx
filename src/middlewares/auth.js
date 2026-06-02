const { supabaseAdmin } = require('../db/supabase');

const validateSubscriberApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key. Include x-api-key header.'
    });
  }

  try {
    const { data: subscriber, error } = await supabaseAdmin
      .from('subscribers')
      .select('id, email, api_key, tier, is_active, rate_limit, daily_limit')
      .eq('api_key', apiKey)
      .single();

    if (error || !subscriber) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!subscriber.is_active) {
      return res.status(403).json({
        success: false,
        error: 'API key is inactive. Contact support.'
      });
    }

    req.subscriber = subscriber;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = { validateSubscriberApiKey };