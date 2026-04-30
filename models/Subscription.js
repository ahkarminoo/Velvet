import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  // Organization/Restaurant reference
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOwner',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },
  
  // Subscription details
  planType: {
    type: String,
    enum: ['free', 'basic', 'business', 'professional', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
    default: 'active'
  },
  
  // Billing information
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  price: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'THB'
  },
  
  // Subscription dates
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  trialEndDate: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  
  // Usage tracking
  usage: {
    // Restaurants
    restaurantsUsed: {
      type: Number,
      default: 0
    },
    restaurantsLimit: {
      type: Number,
      default: 1
    },
    
    // Floor plans
    floorPlansUsed: {
      type: Number,
      default: 0
    },
    floorPlansLimit: {
      type: Number,
      default: 1
    },
    
    // Tables
    tablesUsed: {
      type: Number,
      default: 0
    },
    tablesLimit: {
      type: Number,
      default: 20
    },
    
    // Staff members
    staffUsed: {
      type: Number,
      default: 0
    },
    staffLimit: {
      type: Number,
      default: 5
    },
    
    // Bookings per month
    bookingsThisMonth: {
      type: Number,
      default: 0
    },
    bookingsLimit: {
      type: Number,
      default: 1000
    },
    
    // API calls
    apiCallsThisMonth: {
      type: Number,
      default: 0
    },
    apiCallsLimit: {
      type: Number,
      default: 10000
    },
    
    // Storage (in MB)
    storageUsed: {
      type: Number,
      default: 0
    },
    storageLimit: {
      type: Number,
      default: 1000
    }
  },
  
  // Feature flags
  features: {
    // Velvet: venue & event features
    eventManagement: { type: Boolean, default: false },
    zonePricing: { type: Boolean, default: false },
    advancedVenueTypes: { type: Boolean, default: false },
    multiFloorplanEvents: { type: Boolean, default: false },
    // Basic features
    floorPlan3D: {
      type: Boolean,
      default: true
    },
    realTimeReservations: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    basicAnalytics: {
      type: Boolean,
      default: true
    },
    
    // Advanced features
    custom3DModels: {
      type: Boolean,
      default: false
    },
    arSupport: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    },
    customIntegrations: {
      type: Boolean,
      default: false
    }
  },
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'paypal', 'none'],
    default: 'none'
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  },
  
  // Metadata
  notes: {
    type: String,
    default: ''
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
subscriptionSchema.index({ restaurantId: 1 });
subscriptionSchema.index({ ownerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ planType: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && (!this.endDate || this.endDate > new Date());
});

// Virtual for checking if in trial
subscriptionSchema.virtual('isTrial').get(function() {
  return this.status === 'trialing' && this.trialEndDate && this.trialEndDate > new Date();
});

// Method to check if feature is available
subscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Method to check usage limits
subscriptionSchema.methods.isWithinLimit = function(usageType) {
  return this.usage[`${usageType}Used`] < this.usage[`${usageType}Limit`];
};

// Method to increment usage
subscriptionSchema.methods.incrementUsage = function(usageType, amount = 1) {
  this.usage[`${usageType}Used`] += amount;
  return this.save();
};

// Method to reset monthly usage
subscriptionSchema.methods.resetMonthlyUsage = function() {
  this.usage.bookingsThisMonth = 0;
  this.usage.apiCallsThisMonth = 0;
  return this.save();
};

// Static method to get plan limits
subscriptionSchema.statics.getPlanLimits = function(planType) {
  const limits = {
    free: {
      restaurantsLimit: 1,
      floorPlansLimit: 1,
      tablesLimit: 10,
      staffLimit: 2,
      bookingsLimit: 100,
      apiCallsLimit: 1000,
      storageLimit: 100,
      features: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: false,
        basicAnalytics: false,
        custom3DModels: false,
        arSupport: false,
        advancedAnalytics: false,
        prioritySupport: false,
        apiAccess: false,
        whiteLabel: false,
        customIntegrations: false
      }
    },
    basic: {
      restaurantsLimit: 1,
      floorPlansLimit: 1,
      tablesLimit: 20,
      staffLimit: 5,
      bookingsLimit: 1000,
      apiCallsLimit: 10000,
      storageLimit: 1000,
      features: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: false,
        arSupport: false,
        advancedAnalytics: false,
        prioritySupport: false,
        apiAccess: false,
        whiteLabel: false,
        customIntegrations: false
      }
    },
    business: {
      restaurantsLimit: 2,
      floorPlansLimit: 2,
      tablesLimit: 50,
      staffLimit: 10,
      bookingsLimit: 5000,
      apiCallsLimit: 50000,
      storageLimit: 5000,
      features: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: false,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: false,
        customIntegrations: false
      }
    },
    professional: {
      restaurantsLimit: 5,
      floorPlansLimit: 5,
      tablesLimit: 100,
      staffLimit: 25,
      bookingsLimit: 15000,
      apiCallsLimit: 150000,
      storageLimit: 15000,
      features: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true
      }
    },
    enterprise: {
      restaurantsLimit: -1, // Unlimited
      floorPlansLimit: -1, // Unlimited
      tablesLimit: -1, // Unlimited
      staffLimit: -1, // Unlimited
      bookingsLimit: -1, // Unlimited
      apiCallsLimit: -1, // Unlimited
      storageLimit: -1, // Unlimited
      features: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true
      }
    }
  };
  
  return limits[planType] || limits.free;
};

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
