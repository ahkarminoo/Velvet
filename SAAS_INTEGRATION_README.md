# SaaS Integration for Restaurant Management System

## Overview

This document describes the complete SaaS (Software as a Service) integration for the restaurant management system. The integration includes subscription management, usage tracking, organization management, and analytics.

## Models

### 1. Restaurant Model (Updated)
**File:** `models/Restaurants.js`

**New SaaS Fields:**
- `subscriptionId`: Reference to subscription
- `organizationId`: Reference to organization
- `saasStatus`: Current SaaS status (active, inactive, suspended, trial)
- `features`: Feature flags for different plan tiers
- `limits`: Usage limits based on subscription plan

**New Methods:**
- `hasFeature(featureName)`: Check if feature is available
- `isWithinLimit(usageType)`: Check usage limits
- `getPlanType()`: Get current plan type
- `updateFeaturesFromPlan(planType)`: Update features based on plan

### 2. Subscription Model
**File:** `models/Subscription.js`

**Features:**
- Plan types: free, basic, business, professional, enterprise
- Usage tracking for all resources
- Feature flags for each plan
- Billing information and payment tracking
- Automatic plan limit management

**Plan Tiers:**
- **Free**: 1 floor plan, 10 tables, 2 staff, 100 bookings/month
- **Basic**: 1 floor plan, 20 tables, 5 staff, 1,000 bookings/month
- **Business**: 2 floor plans, 50 tables, 10 staff, 5,000 bookings/month
- **Professional**: 5 floor plans, 100 tables, 25 staff, 15,000 bookings/month
- **Enterprise**: Unlimited everything

### 3. Organization Model
**File:** `models/Organization.js`

**Features:**
- Multi-tenant organization management
- Member roles and permissions
- Organization settings and branding
- Usage statistics tracking

### 4. UsageAnalytics Model
**File:** `models/UsageAnalytics.js`

**Features:**
- Event tracking for all user actions
- API usage monitoring
- Booking analytics
- Performance metrics
- Data retention and cleanup

## API Endpoints

### SaaS Management APIs

#### 1. Restaurant Subscription
- `GET /api/saas/subscriptions/restaurant/[id]` - Get subscription details
- `PUT /api/saas/subscriptions/restaurant/[id]` - Update subscription

#### 2. Restaurant Usage
- `GET /api/saas/usage/restaurant/[id]` - Get usage statistics

#### 3. Restaurant Organization
- `GET /api/saas/organizations/restaurant/[id]` - Get organization details
- `PUT /api/saas/organizations/restaurant/[id]` - Update organization

## Integration Script

### Running the Integration
```bash
npm run integrate-saas
```

**What it does:**
1. **Creates Organizations**: One per restaurant owner
2. **Creates Subscriptions**: Based on restaurant activity
3. **Updates Restaurants**: Adds SaaS fields and references
4. **Creates Analytics**: Initial usage tracking events
5. **Calculates Usage**: Real usage from existing data

**Plan Assignment Logic:**
- **Free**: New restaurants with minimal activity
- **Basic**: Restaurants with 1+ floor plans or 100+ bookings
- **Business**: Restaurants with 2+ floor plans or 500+ bookings
- **Professional**: High-activity restaurants
- **Enterprise**: Custom assignment

## Admin Dashboard Integration

### Restaurant Management Tab
- **SaaS Management Button**: Purple gear icon (⚙️) for each restaurant
- **Modal Interface**: Comprehensive SaaS management
- **Real-time Data**: Live subscription, usage, and organization data

### Features in Modal:
1. **Subscription Status**: Plan, status, billing, price
2. **Usage Statistics**: Current usage vs limits
3. **Organization Info**: Organization details and settings
4. **Quick Actions**: Update subscription, view analytics, manage organization

## Usage Tracking

### Automatic Tracking
- **Booking Events**: Created, updated, cancelled, completed
- **Floor Plan Events**: Created, updated, deleted, viewed
- **API Events**: All API calls with response times
- **Feature Events**: Feature usage and limit reached
- **System Events**: Login, logout, subscription changes

### Analytics Available
- **Daily Usage Trends**: Usage patterns over time
- **Top Users**: Most active users by organization
- **API Usage Stats**: Endpoint performance and usage
- **Booking Analytics**: Booking patterns and metrics

## Database Structure

### Collections Created:
1. **subscriptions**: Subscription plans and billing
2. **organizations**: Multi-tenant organization data
3. **usageanalytics**: Event tracking and analytics

### Indexes Added:
- Restaurant: `subscriptionId`, `organizationId`, `saasStatus`
- Subscription: `restaurantId`, `ownerId`, `status`, `planType`
- Organization: `slug`, `email`, `members.userId`, `status`
- UsageAnalytics: Multiple indexes for efficient querying

## Features by Plan

### Free Plan
- ✅ 3D Floor Plans
- ✅ Real-time Reservations
- ❌ Email Notifications
- ❌ Basic Analytics
- ❌ Custom 3D Models
- ❌ AR Support
- ❌ Advanced Analytics
- ❌ Priority Support
- ❌ API Access
- ❌ White Label
- ❌ Custom Integrations

### Basic Plan
- ✅ 3D Floor Plans
- ✅ Real-time Reservations
- ✅ Email Notifications
- ✅ Basic Analytics
- ❌ Custom 3D Models
- ❌ AR Support
- ❌ Advanced Analytics
- ❌ Priority Support
- ❌ API Access
- ❌ White Label
- ❌ Custom Integrations

### Business Plan
- ✅ 3D Floor Plans
- ✅ Real-time Reservations
- ✅ Email Notifications
- ✅ Basic Analytics
- ✅ Custom 3D Models
- ❌ AR Support
- ✅ Advanced Analytics
- ✅ Priority Support
- ✅ API Access
- ❌ White Label
- ❌ Custom Integrations

### Professional Plan
- ✅ All Basic + Business features
- ✅ AR Support
- ✅ White Label
- ✅ Custom Integrations

### Enterprise Plan
- ✅ All features
- ✅ Unlimited usage
- ✅ Custom limits
- ✅ Dedicated support

## Usage Limits

| Feature | Free | Basic | Business | Professional | Enterprise |
|---------|------|-------|----------|--------------|------------|
| Floor Plans | 1 | 1 | 2 | 5 | Unlimited |
| Tables | 10 | 20 | 50 | 100 | Unlimited |
| Staff | 2 | 5 | 10 | 25 | Unlimited |
| Bookings/Month | 100 | 1,000 | 5,000 | 15,000 | Unlimited |
| API Calls/Month | 1,000 | 10,000 | 50,000 | 150,000 | Unlimited |
| Storage (MB) | 100 | 1,000 | 5,000 | 15,000 | Unlimited |

## Monitoring and Analytics

### Key Metrics Tracked:
1. **Usage Metrics**: Floor plans, tables, staff, bookings, API calls
2. **Performance Metrics**: Response times, error rates, uptime
3. **Business Metrics**: Revenue, customer growth, churn rate
4. **Feature Usage**: Which features are most/least used

### Analytics Dashboard:
- Real-time usage monitoring
- Historical trend analysis
- Plan upgrade recommendations
- Usage limit alerts
- Performance optimization insights

## Security and Compliance

### Data Protection:
- All SaaS data is encrypted at rest
- API endpoints require proper authentication
- Usage analytics respect user privacy
- GDPR-compliant data handling

### Access Control:
- Role-based permissions
- Organization-level isolation
- Feature-based access control
- Audit logging for all actions

## Next Steps

1. **Run Integration**: Execute `npm run integrate-saas`
2. **Test SaaS Management**: Use admin dashboard to manage subscriptions
3. **Monitor Usage**: Check analytics and usage patterns
4. **Plan Upgrades**: Recommend plan upgrades based on usage
5. **Feature Rollout**: Gradually enable features based on plan tiers

## Support

For questions or issues with the SaaS integration:
1. Check the admin dashboard SaaS management modal
2. Review usage analytics for insights
3. Monitor subscription status and limits
4. Contact support for plan upgrades or custom features

---

**Note**: This SaaS integration is designed to work with your existing restaurant data structure and provides a complete subscription management system with usage tracking and analytics.
