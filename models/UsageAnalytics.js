import mongoose from 'mongoose';

const usageAnalyticsSchema = new mongoose.Schema({
  // Organization reference
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOwner',
    required: false
  },
  
  // Event details
  eventType: {
    type: String,
    required: true,
    enum: [
      // Booking events
      'booking_created',
      'booking_updated',
      'booking_cancelled',
      'booking_completed',
      
      // Floor plan events
      'floorplan_created',
      'floorplan_updated',
      'floorplan_deleted',
      'floorplan_viewed',
      
      // Staff events
      'staff_added',
      'staff_updated',
      'staff_removed',
      'staff_login',
      
      // API events
      'api_call',
      'api_rate_limit_exceeded',
      
      // Feature usage
      'feature_used',
      'feature_limit_reached',
      
      // System events
      'login',
      'logout',
      'subscription_created',
      'subscription_updated',
      'subscription_cancelled',
      'payment_success',
      'payment_failed'
    ]
  },
  
  // Event data
  eventData: {
    // For booking events
    bookingId: mongoose.Schema.Types.ObjectId,
    tableId: mongoose.Schema.Types.ObjectId,
    customerId: mongoose.Schema.Types.ObjectId,
    partySize: Number,
    duration: Number, // in minutes
    
    // For API events
    endpoint: String,
    method: String,
    responseTime: Number, // in milliseconds
    statusCode: Number,
    requestSize: Number, // in bytes
    responseSize: Number, // in bytes
    
    // For feature events
    featureName: String,
    featureData: mongoose.Schema.Types.Mixed,
    
    // For payment events
    amount: Number,
    currency: String,
    paymentMethod: String,
    
    // General metadata
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Session information
  sessionId: {
    type: String,
    index: true
  },
  
  // Device/Client information
  clientInfo: {
    userAgent: String,
    ipAddress: String,
    platform: String,
    browser: String,
    device: String
  },
  
  // Location information (if available)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
usageAnalyticsSchema.index({ organizationId: 1, timestamp: -1 });
usageAnalyticsSchema.index({ restaurantId: 1, timestamp: -1 });
usageAnalyticsSchema.index({ userId: 1, timestamp: -1 });
usageAnalyticsSchema.index({ eventType: 1, timestamp: -1 });
usageAnalyticsSchema.index({ 'eventData.bookingId': 1 });
usageAnalyticsSchema.index({ 'eventData.endpoint': 1, timestamp: -1 });

// Static method to track event
usageAnalyticsSchema.statics.trackEvent = async function(data) {
  const analytics = new this(data);
  return analytics.save();
};

// Static method to get usage statistics
usageAnalyticsSchema.statics.getUsageStats = async function(organizationId, startDate, endDate) {
  const matchStage = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueSessions: { $size: '$uniqueSessions' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get API usage statistics
usageAnalyticsSchema.statics.getApiUsageStats = async function(organizationId, startDate, endDate) {
  const matchStage = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    eventType: 'api_call',
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$eventData.endpoint',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$eventData.responseTime' },
        totalRequestSize: { $sum: '$eventData.requestSize' },
        totalResponseSize: { $sum: '$eventData.responseSize' },
        statusCodes: { $push: '$eventData.statusCode' }
      }
    },
    {
      $project: {
        endpoint: '$_id',
        count: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        totalRequestSize: 1,
        totalResponseSize: 1,
        statusCodes: 1
      }
    },
    { $sort: { count: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get booking analytics
usageAnalyticsSchema.statics.getBookingAnalytics = async function(organizationId, startDate, endDate) {
  const matchStage = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    eventType: { $in: ['booking_created', 'booking_cancelled', 'booking_completed'] },
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        avgPartySize: { $avg: '$eventData.partySize' },
        avgDuration: { $avg: '$eventData.duration' }
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        avgPartySize: { $round: ['$avgPartySize', 1] },
        avgDuration: { $round: ['$avgDuration', 1] }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get daily usage trends
usageAnalyticsSchema.statics.getDailyUsageTrends = async function(organizationId, startDate, endDate) {
  const matchStage = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        events: {
          $push: {
            eventType: '$_id.eventType',
            count: '$count'
          }
        },
        totalEvents: { $sum: '$count' }
      }
    },
    { $sort: { '_id': 1 } }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get top users by activity
usageAnalyticsSchema.statics.getTopUsers = async function(organizationId, startDate, endDate, limit = 10) {
  const matchStage = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    userId: { $exists: true, $ne: null },
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$userId',
        totalEvents: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $lookup: {
        from: 'restaurantowners',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        totalEvents: 1,
        uniqueSessions: { $size: '$uniqueSessions' },
        lastActivity: 1
      }
    },
    { $sort: { totalEvents: -1 } },
    { $limit: limit }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to clean up old analytics data
usageAnalyticsSchema.statics.cleanupOldData = async function(daysToKeep = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

export default mongoose.models.UsageAnalytics || mongoose.model('UsageAnalytics', usageAnalyticsSchema);
