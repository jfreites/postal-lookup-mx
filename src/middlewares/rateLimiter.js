const { supabaseAdmin } = require('../db/supabase');

const trackUsage = async (subscriberId) => {
  const now = new Date();
  const minuteTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
  const minuteStr = minuteTimestamp.toISOString();
  const dateStr = minuteStr.split('T')[0];

  const { error } = await supabaseAdmin.rpc('increment_usage', {
    p_subscriber_id: subscriberId,
    p_minute_timestamp: minuteStr,
    p_date: dateStr
  });

  if (error) {
    console.error('Track usage error:', error);
  }
};

const checkRateLimit = async (req, res, next) => {
  const subscriber = req.subscriber;
  if (!subscriber) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  const now = new Date();
  const minuteTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
  const minuteStr = minuteTimestamp.toISOString();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = todayStart.toISOString().split('T')[0];

  try {
    const { data: usageData } = await supabaseAdmin
      .from('api_usage')
      .select('request_count')
      .eq('subscriber_id', subscriber.id)
      .gte('minute_timestamp', minuteStr)
      .single();

    const minuteCount = usageData?.request_count || 0;

    if (minuteCount >= subscriber.rate_limit) {
      const retryAfter = 60 - now.getSeconds();
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. You can make ${subscriber.rate_limit} requests per minute. Retry after ${retryAfter} seconds.`
      });
    }

    const { data: dailyData } = await supabaseAdmin
      .from('api_usage')
      .select('request_count')
      .eq('subscriber_id', subscriber.id)
      .gte('date', todayStr)
      .single();

    const dailyCount = dailyData?.request_count || 0;

    if (dailyCount >= subscriber.daily_limit) {
      const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
      res.set('Retry-After', Math.ceil(msUntilMidnight / 1000));
      return res.status(429).json({
        success: false,
        error: `Daily limit exceeded. You can make ${subscriber.daily_limit} requests per day. Reset at midnight.`
      });
    }

    await trackUsage(subscriber.id);

    res.set('X-RateLimit-Limit', subscriber.rate_limit);
    res.set('X-RateLimit-Remaining', Math.max(0, subscriber.rate_limit - minuteCount - 1));
    res.set('X-DailyLimit-Remaining', Math.max(0, subscriber.daily_limit - dailyCount - 1));

    next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    next();
  }
};

module.exports = { checkRateLimit, trackUsage };