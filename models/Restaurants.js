import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
  floorplans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Floorplan'
  }],
  defaultFloorplanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Floorplan'
  },
  venueType: {
    type: String,
    enum: ['restaurant', 'bar', 'club', 'hotel_restaurant', 'rooftop_bar', 'lounge'],
    default: 'restaurant'
  },
  venueSettings: {
    dresscode: { type: String, default: '' },
    ageRestriction: { type: Number, default: 0 },
    minimumSpend: { type: Number, default: 0 },
    lateNight: { type: Boolean, default: false },
    coverCharge: { type: Number, default: 0 }
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantOwner",
    required: true,
  },
  restaurantName: {
    type: String,
    required: true,
  },
  cuisineType: {
    type: String,
    required: true,
  },
  location: {
    address: String,
    placeId: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  description: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    default: ""
  },
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  images: {
    main: { type: String, default: "" },
    gallery: [{ type: String }],
    menu: [{ type: String }]
  },
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // SaaS Integration
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  
  // SaaS Status
  saasStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'active'
  },
  
  // Feature flags
  features: {
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
  
  // Usage limits
  limits: {
    floorPlansLimit: {
      type: Number,
      default: 1
    },
    tablesLimit: {
      type: Number,
      default: 20
    },
    staffLimit: {
      type: Number,
      default: 5
    },
    bookingsLimit: {
      type: Number,
      default: 1000
    },
    apiCallsLimit: {
      type: Number,
      default: 10000
    },
    storageLimit: {
      type: Number,
      default: 1000
    }
  }
}, { timestamps: true });

// Indexes for SaaS functionality
restaurantSchema.index({ subscriptionId: 1 });
restaurantSchema.index({ organizationId: 1 });
restaurantSchema.index({ saasStatus: 1 });

// Method to check if feature is available
restaurantSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Method to check usage limits
restaurantSchema.methods.isWithinLimit = function(usageType) {
  return this.limits[`${usageType}Limit`] === -1 || this.limits[`${usageType}Limit`] > 0;
};

// Method to get plan type from subscription
restaurantSchema.methods.getPlanType = async function() {
  if (this.subscriptionId) {
    const Subscription = mongoose.model('Subscription');
    const subscription = await Subscription.findById(this.subscriptionId);
    return subscription ? subscription.planType : 'basic';
  }
  return 'basic';
};

// Method to update features based on plan
restaurantSchema.methods.updateFeaturesFromPlan = async function(planType) {
  const Subscription = mongoose.model('Subscription');
  const planLimits = Subscription.getPlanLimits(planType);
  
  // Update features
  Object.keys(planLimits.features).forEach(feature => {
    this.features[feature] = planLimits.features[feature];
  });
  
  // Update limits
  Object.keys(planLimits).forEach(limit => {
    if (limit !== 'features' && this.limits[limit] !== undefined) {
      this.limits[limit] = planLimits[limit];
    }
  });
  
  return this.save();
};

const Restaurant = mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
