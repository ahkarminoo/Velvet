import UsageAnalytics from '@/models/UsageAnalytics';
import Subscription from '@/models/Subscription';

// Middleware to track API usage
export const trackApiUsage = async (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Track request data
  const requestData = {
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip || req.connection.remoteAddress,
    requestSize: JSON.stringify(req.body || {}).length
  };
  
  // Override res.send to capture response data
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const responseSize = JSON.stringify(data).length;
    
    // Track the API call asynchronously (don't block response)
    trackApiCallAsync({
      ...requestData,
      responseTime,
      responseSize,
      statusCode: res.statusCode,
      organizationId: req.user?.organizationId,
      userId: req.user?.userId,
      sessionId: req.sessionID
    });
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
};

// Async function to track API calls
async function trackApiCallAsync(data) {
  try {
    await UsageAnalytics.trackEvent({
      organizationId: data.organizationId,
      userId: data.userId,
      eventType: 'api_call',
      eventData: {
        endpoint: data.endpoint,
        method: data.method,
        responseTime: data.responseTime,
        statusCode: data.statusCode,
        requestSize: data.requestSize,
        responseSize: data.responseSize
      },
      sessionId: data.sessionId,
      clientInfo: {
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      }
    });
    
    // Increment API usage counter if organization exists
    if (data.organizationId) {
      await incrementUsageCounter(data.organizationId, 'apiCallsThisMonth');
    }
  } catch (error) {
    console.error('Error tracking API usage:', error);
  }
}

// Function to increment usage counters
export const incrementUsageCounter = async (organizationId, usageType, amount = 1) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    if (subscription) {
      await subscription.incrementUsage(usageType, amount);
    }
  } catch (error) {
    console.error('Error incrementing usage counter:', error);
  }
};

// Function to check usage limits
export const checkUsageLimit = async (organizationId, usageType) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      return { allowed: false, reason: 'No subscription found' };
    }
    
    const isWithinLimit = subscription.isWithinLimit(usageType);
    if (!isWithinLimit) {
      return { 
        allowed: false, 
        reason: `${usageType} limit exceeded`,
        current: subscription.usage[`${usageType}Used`],
        limit: subscription.usage[`${usageType}Limit`]
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
};

// Function to check feature access
export const checkFeatureAccess = async (organizationId, featureName) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      return { allowed: false, reason: 'No subscription found' };
    }
    
    const hasFeature = subscription.hasFeature(featureName);
    if (!hasFeature) {
      return { 
        allowed: false, 
        reason: `Feature '${featureName}' not available in current plan`,
        currentPlan: subscription.planType
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, reason: 'Error checking feature access' };
  }
};

// Middleware to enforce usage limits
export const enforceUsageLimits = (usageType) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }
      
      const limitCheck = await checkUsageLimit(organizationId, usageType);
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          details: limitCheck
        });
      }
      
      next();
    } catch (error) {
      console.error('Error enforcing usage limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to enforce feature access
export const enforceFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }
      
      const featureCheck = await checkFeatureAccess(organizationId, featureName);
      if (!featureCheck.allowed) {
        return res.status(403).json({
          error: 'Feature not available',
          details: featureCheck
        });
      }
      
      next();
    } catch (error) {
      console.error('Error enforcing feature access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Function to track feature usage
export const trackFeatureUsage = async (organizationId, userId, featureName, featureData = {}) => {
  try {
    await UsageAnalytics.trackEvent({
      organizationId,
      userId,
      eventType: 'feature_used',
      eventData: {
        featureName,
        featureData
      }
    });
  } catch (error) {
    console.error('Error tracking feature usage:', error);
  }
};

// Function to reset monthly usage counters
export const resetMonthlyUsage = async () => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' });
    
    for (const subscription of subscriptions) {
      await subscription.resetMonthlyUsage();
    }
    
    console.log(`Reset monthly usage for ${subscriptions.length} subscriptions`);
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
  }
};

// Schedule monthly reset (call this from a cron job or scheduler)
export const scheduleMonthlyReset = () => {
  // Run on the 1st of every month at midnight
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const timeUntilNextMonth = nextMonth.getTime() - now.getTime();
  
  setTimeout(() => {
    resetMonthlyUsage();
    // Schedule the next reset
    setInterval(resetMonthlyUsage, 30 * 24 * 60 * 60 * 1000); // 30 days
  }, timeUntilNextMonth);
};
