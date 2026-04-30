# SaaS Implementation for FoodLoft

This document outlines the comprehensive SaaS (Software as a Service) implementation added to the FoodLoft restaurant reservation platform. The implementation includes multi-tenant architecture, subscription management, usage tracking, analytics, and feature flags.

## 🏗️ Architecture Overview

### Core Components

1. **Multi-Tenant Architecture**
   - Organizations as tenants
   - Role-based access control
   - Isolated data per organization

2. **Subscription Management**
   - Multiple pricing tiers
   - Usage tracking and limits
   - Feature flags per plan

3. **Analytics & Monitoring**
   - Real-time usage analytics
   - Performance monitoring
   - Business intelligence dashboard

4. **Admin Panel**
   - SaaS management interface
   - Customer support tools
   - Revenue analytics

## 📊 Data Models

### Subscription Model (`models/Subscription.js`)
```javascript
{
  organizationId: ObjectId,
  ownerId: ObjectId,
  planType: String, // free, basic, business, professional, enterprise
  status: String, // active, inactive, cancelled, past_due, trialing
  billingCycle: String, // monthly, yearly
  price: Number,
  currency: String,
  usage: {
    floorPlansUsed: Number,
    floorPlansLimit: Number,
    tablesUsed: Number,
    tablesLimit: Number,
    staffUsed: Number,
    staffLimit: Number,
    bookingsThisMonth: Number,
    bookingsLimit: Number,
    apiCallsThisMonth: Number,
    apiCallsLimit: Number,
    storageUsed: Number,
    storageLimit: Number
  },
  features: {
    floorPlan3D: Boolean,
    realTimeReservations: Boolean,
    emailNotifications: Boolean,
    basicAnalytics: Boolean,
    custom3DModels: Boolean,
    arSupport: Boolean,
    advancedAnalytics: Boolean,
    prioritySupport: Boolean,
    apiAccess: Boolean,
    whiteLabel: Boolean,
    customIntegrations: Boolean
  }
}
```

### Organization Model (`models/Organization.js`)
```javascript
{
  name: String,
  slug: String,
  type: String, // restaurant, hotel, cafe, bar, catering, other
  email: String,
  phone: String,
  website: String,
  address: Object,
  settings: Object,
  branding: Object,
  members: [{
    userId: ObjectId,
    role: String, // owner, admin, manager, staff
    permissions: [String],
    joinedAt: Date,
    isActive: Boolean
  }],
  status: String, // active, inactive, suspended, pending
  subscriptionId: ObjectId,
  stats: Object
}
```

### Usage Analytics Model (`models/UsageAnalytics.js`)
```javascript
{
  organizationId: ObjectId,
  restaurantId: ObjectId,
  userId: ObjectId,
  eventType: String,
  eventData: Object,
  timestamp: Date,
  sessionId: String,
  clientInfo: Object,
  location: Object
}
```

## 💰 Pricing Plans

### Free Plan
- **Price**: THB 0/month
- **Features**: Basic 3D floor plan, real-time reservations
- **Limits**: 1 floor plan, 10 tables, 2 staff, 100 bookings/month

### Basic Plan
- **Price**: THB 1,200/month
- **Features**: All Free + email notifications, basic analytics
- **Limits**: 1 floor plan, 20 tables, 5 staff, 1,000 bookings/month

### Business Plan
- **Price**: THB 2,800/month
- **Features**: All Basic + custom 3D models, advanced analytics, API access
- **Limits**: 2 floor plans, 50 tables, 10 staff, 5,000 bookings/month

### Professional Plan
- **Price**: THB 5,500/month
- **Features**: All Business + AR support, white-label, custom integrations
- **Limits**: 5 floor plans, 100 tables, 25 staff, 15,000 bookings/month

### Enterprise Plan
- **Price**: THB 12,000/month
- **Features**: All Professional + unlimited everything, dedicated support
- **Limits**: Unlimited

## 🔧 API Endpoints

### Subscription Management
- `GET /api/saas/subscriptions` - List all subscriptions
- `POST /api/saas/subscriptions` - Create new subscription
- `GET /api/saas/subscriptions/[id]` - Get subscription by ID
- `PUT /api/saas/subscriptions/[id]` - Update subscription
- `DELETE /api/saas/subscriptions/[id]` - Cancel subscription
- `GET /api/saas/subscriptions/current` - Get current user's subscription
- `POST /api/saas/subscriptions/upgrade` - Upgrade/downgrade plan

### Organization Management
- `GET /api/saas/organizations` - List all organizations
- `POST /api/saas/organizations` - Create new organization
- `GET /api/saas/organizations/[id]` - Get organization by ID
- `PUT /api/saas/organizations/[id]` - Update organization
- `DELETE /api/saas/organizations/[id]` - Delete organization

### Analytics
- `GET /api/saas/admin/analytics` - Get overall SaaS analytics
- `POST /api/saas/admin/analytics` - Get organization-specific analytics

## 🎛️ Admin Dashboard

### Features
- **Overview Tab**: Key metrics, revenue analytics, top organizations
- **Subscriptions Tab**: Manage all subscriptions, filter by plan/status
- **Organizations Tab**: View and manage all organizations
- **Analytics Tab**: Detailed usage analytics and trends
- **Settings Tab**: SaaS configuration and system settings

### Access
Navigate to `/saas-admin` to access the admin dashboard.

## 🔒 Feature Flags & Usage Limits

### Middleware
- `enforceFeatureAccess(featureFlag)` - Restrict access to premium features
- `enforceUsageLimit(resourceType)` - Enforce usage limits
- `trackApiUsage()` - Track API usage automatically

### Usage
```javascript
// Enforce feature access
app.use('/api/premium-feature', enforceFeatureAccess('advancedAnalytics'));

// Enforce usage limits
app.use('/api/bookings', enforceUsageLimit('bookings'));

// Track API usage
app.use(trackApiUsage);
```

## 📈 Analytics & Monitoring

### Tracked Events
- Booking events (created, updated, cancelled, completed)
- Floor plan events (created, updated, deleted, viewed)
- Staff events (added, updated, removed, login)
- API events (calls, rate limit exceeded)
- Feature usage events
- System events (login, logout, subscription changes)

### Analytics Queries
- Usage statistics by organization
- API usage patterns
- Booking analytics
- Daily usage trends
- Top users by activity

## 🚀 Getting Started

### 1. Database Setup
The SaaS implementation uses MongoDB with the following collections:
- `subscriptions` - Subscription data
- `organizations` - Organization/tenant data
- `usageanalytics` - Usage tracking data

### 2. Environment Variables
```env
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string
```

### 3. Initialize Default Data
```javascript
// Create default free subscription for existing users
const freePlanLimits = Subscription.getPlanLimits('free');
const subscription = new Subscription({
  organizationId: organizationId,
  ownerId: userId,
  planType: 'free',
  // ... other fields
});
```

### 4. Usage Tracking
```javascript
// Track feature usage
await UsageAnalytics.trackEvent({
  organizationId,
  userId,
  eventType: 'feature_used',
  eventData: {
    featureName: 'advancedAnalytics',
    featureData: { reportType: 'revenue' }
  }
});
```

## 🔄 Migration Guide

### For Existing Users
1. Create organization for each restaurant owner
2. Create default free subscription
3. Migrate existing data to new structure
4. Update authentication to include organization context

### For New Features
1. Add feature flag to subscription model
2. Update plan limits in `getPlanLimits()` method
3. Add middleware to protect feature endpoints
4. Update UI to show/hide features based on plan

## 📊 Monitoring & Maintenance

### Monthly Tasks
- Reset usage counters
- Generate revenue reports
- Review usage analytics
- Update subscription statuses

### Automated Tasks
- Usage limit enforcement
- Feature access control
- API rate limiting
- Analytics data collection

## 🛡️ Security Considerations

### Data Isolation
- Organization-based data segregation
- Role-based access control
- API authentication and authorization

### Usage Limits
- Prevent abuse through usage tracking
- Automatic rate limiting
- Feature access restrictions

### Analytics Privacy
- Anonymized usage data
- Configurable data retention
- GDPR compliance considerations

## 🎯 Future Enhancements

### Planned Features
- Automated billing integration
- Advanced analytics dashboard
- Custom plan creation
- Multi-currency support
- API marketplace
- White-label solutions

### Scalability
- Horizontal scaling support
- Database sharding
- CDN integration
- Microservices architecture

## 📞 Support

For questions about the SaaS implementation:
- Check the API documentation
- Review the admin dashboard
- Contact the development team

---

This SaaS implementation provides a solid foundation for scaling the FoodLoft platform as a multi-tenant service with comprehensive subscription management, usage tracking, and analytics capabilities.
