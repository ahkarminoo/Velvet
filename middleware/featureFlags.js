import Subscription from '@/models/Subscription';
import UsageAnalytics from '@/models/UsageAnalytics';

// Feature flag definitions
export const FEATURE_FLAGS = {
  // Basic features (available in all plans)
  FLOOR_PLAN_3D: 'floorPlan3D',
  REAL_TIME_RESERVATIONS: 'realTimeReservations',
  
  // Premium features
  EMAIL_NOTIFICATIONS: 'emailNotifications',
  BASIC_ANALYTICS: 'basicAnalytics',
  CUSTOM_3D_MODELS: 'custom3DModels',
  AR_SUPPORT: 'arSupport',
  ADVANCED_ANALYTICS: 'advancedAnalytics',
  PRIORITY_SUPPORT: 'prioritySupport',
  API_ACCESS: 'apiAccess',
  WHITE_LABEL: 'whiteLabel',
  CUSTOM_INTEGRATIONS: 'customIntegrations'
};

// Plan feature mappings
export const PLAN_FEATURES = {
  free: [
    FEATURE_FLAGS.FLOOR_PLAN_3D,
    FEATURE_FLAGS.REAL_TIME_RESERVATIONS
  ],
  basic: [
    FEATURE_FLAGS.FLOOR_PLAN_3D,
    FEATURE_FLAGS.REAL_TIME_RESERVATIONS,
    FEATURE_FLAGS.EMAIL_NOTIFICATIONS,
    FEATURE_FLAGS.BASIC_ANALYTICS
  ],
  business: [
    FEATURE_FLAGS.FLOOR_PLAN_3D,
    FEATURE_FLAGS.REAL_TIME_RESERVATIONS,
    FEATURE_FLAGS.EMAIL_NOTIFICATIONS,
    FEATURE_FLAGS.BASIC_ANALYTICS,
    FEATURE_FLAGS.CUSTOM_3D_MODELS,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.API_ACCESS
  ],
  professional: [
    FEATURE_FLAGS.FLOOR_PLAN_3D,
    FEATURE_FLAGS.REAL_TIME_RESERVATIONS,
    FEATURE_FLAGS.EMAIL_NOTIFICATIONS,
    FEATURE_FLAGS.BASIC_ANALYTICS,
    FEATURE_FLAGS.CUSTOM_3D_MODELS,
    FEATURE_FLAGS.AR_SUPPORT,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.API_ACCESS,
    FEATURE_FLAGS.WHITE_LABEL,
    FEATURE_FLAGS.CUSTOM_INTEGRATIONS
  ],
  enterprise: [
    FEATURE_FLAGS.FLOOR_PLAN_3D,
    FEATURE_FLAGS.REAL_TIME_RESERVATIONS,
    FEATURE_FLAGS.EMAIL_NOTIFICATIONS,
    FEATURE_FLAGS.BASIC_ANALYTICS,
    FEATURE_FLAGS.CUSTOM_3D_MODELS,
    FEATURE_FLAGS.AR_SUPPORT,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.API_ACCESS,
    FEATURE_FLAGS.WHITE_LABEL,
    FEATURE_FLAGS.CUSTOM_INTEGRATIONS
  ]
};

// Check if user has access to a feature
export const hasFeatureAccess = async (organizationId, featureFlag) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    
    if (!subscription) {
      // Default to free plan features
      return PLAN_FEATURES.free.includes(featureFlag);
    }
    
    // Check if feature is enabled in subscription
    return subscription.features[featureFlag] === true;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

// Middleware to enforce feature access
export const enforceFeatureAccess = (featureFlag) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ 
          error: 'Organization ID required',
          code: 'MISSING_ORGANIZATION'
        });
      }
      
      const hasAccess = await hasFeatureAccess(organizationId, featureFlag);
      
      if (!hasAccess) {
        // Track feature access attempt
        await UsageAnalytics.trackEvent({
          organizationId,
          userId: req.user?.userId,
          eventType: 'feature_limit_reached',
          eventData: {
            featureName: featureFlag,
            featureData: {
              attemptedAccess: true,
              timestamp: new Date()
            }
          }
        });
        
        return res.status(403).json({
          error: 'Feature not available in your current plan',
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureFlag,
          upgradeRequired: true
        });
      }
      
      // Track feature usage
      await UsageAnalytics.trackEvent({
        organizationId,
        userId: req.user?.userId,
        eventType: 'feature_used',
        eventData: {
          featureName: featureFlag,
          featureData: {
            accessedAt: new Date(),
            endpoint: req.path,
            method: req.method
          }
        }
      });
      
      next();
    } catch (error) {
      console.error('Error enforcing feature access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Check usage limits for a specific resource
export const checkUsageLimit = async (organizationId, resourceType) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    
    if (!subscription) {
      return { 
        allowed: false, 
        reason: 'No subscription found',
        current: 0,
        limit: 0
      };
    }
    
    const used = subscription.usage[`${resourceType}Used`] || 0;
    const limit = subscription.usage[`${resourceType}Limit`] || 0;
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: used, limit: 'unlimited' };
    }
    
    const isWithinLimit = used < limit;
    
    return {
      allowed: isWithinLimit,
      current: used,
      limit: limit,
      reason: isWithinLimit ? null : `${resourceType} limit exceeded`
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return { 
      allowed: false, 
      reason: 'Error checking limits',
      current: 0,
      limit: 0
    };
  }
};

// Middleware to enforce usage limits
export const enforceUsageLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ 
          error: 'Organization ID required',
          code: 'MISSING_ORGANIZATION'
        });
      }
      
      const limitCheck = await checkUsageLimit(organizationId, resourceType);
      
      if (!limitCheck.allowed) {
        // Track limit exceeded event
        await UsageAnalytics.trackEvent({
          organizationId,
          userId: req.user?.userId,
          eventType: 'feature_limit_reached',
          eventData: {
            featureName: `${resourceType}_limit`,
            featureData: {
              attemptedUsage: true,
              current: limitCheck.current,
              limit: limitCheck.limit,
              timestamp: new Date()
            }
          }
        });
        
        return res.status(429).json({
          error: 'Usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          resource: resourceType,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeRequired: true
        });
      }
      
      next();
    } catch (error) {
      console.error('Error enforcing usage limit:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Get user's available features
export const getUserFeatures = async (organizationId) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    
    if (!subscription) {
      return PLAN_FEATURES.free;
    }
    
    return Object.keys(subscription.features).filter(
      feature => subscription.features[feature] === true
    );
  } catch (error) {
    console.error('Error getting user features:', error);
    return PLAN_FEATURES.free;
  }
};

// Get user's usage statistics
export const getUserUsage = async (organizationId) => {
  try {
    const subscription = await Subscription.findOne({ organizationId });
    
    if (!subscription) {
      return null;
    }
    
    return {
      usage: subscription.usage,
      planType: subscription.planType,
      status: subscription.status,
      isActive: subscription.isActive,
      isTrial: subscription.isTrial
    };
  } catch (error) {
    console.error('Error getting user usage:', error);
    return null;
  }
};
