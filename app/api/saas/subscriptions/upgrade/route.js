import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';
import UsageAnalytics from '@/models/UsageAnalytics';

// Upgrade or downgrade subscription
export async function POST(req) {
  try {
    const { planType } = await req.json();
    
    if (!planType) {
      return NextResponse.json(
        { success: false, error: 'Plan type is required' },
        { status: 400 }
      );
    }

    // Get user from JWT token
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    await dbConnect();

    // Find user's organization
    const organization = await Organization.findOne({
      'members.userId': userId,
      'members.isActive': true
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Find existing subscription
    let subscription = await Subscription.findOne({ organizationId: organization._id });

    if (!subscription) {
      // Create new subscription
      const planLimits = Subscription.getPlanLimits(planType);
      const pricing = getPlanPricing(planType, 'monthly');
      
      subscription = new Subscription({
        organizationId: organization._id,
        ownerId: userId,
        planType,
        billingCycle: 'monthly',
        price: pricing.price,
        currency: pricing.currency,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: {
          floorPlansLimit: planLimits.floorPlansLimit,
          tablesLimit: planLimits.tablesLimit,
          staffLimit: planLimits.staffLimit,
          bookingsLimit: planLimits.bookingsLimit,
          apiCallsLimit: planLimits.apiCallsLimit,
          storageLimit: planLimits.storageLimit
        },
        features: planLimits.features
      });

      await subscription.save();

      // Update organization with subscription reference
      organization.subscriptionId = subscription._id;
      await organization.save();

      // Track subscription creation
      await UsageAnalytics.trackEvent({
        organizationId: organization._id,
        userId,
        eventType: 'subscription_created',
        eventData: {
          featureName: 'subscription_creation',
          featureData: {
            planType,
            billingCycle: 'monthly',
            price: pricing.price
          }
        }
      });

    } else {
      // Update existing subscription
      const oldPlanType = subscription.planType;
      const planLimits = Subscription.getPlanLimits(planType);
      const pricing = getPlanPricing(planType, subscription.billingCycle);
      
      // Update plan details
      subscription.planType = planType;
      subscription.price = pricing.price;
      subscription.currency = pricing.currency;
      
      // Update usage limits
      subscription.usage.floorPlansLimit = planLimits.floorPlansLimit;
      subscription.usage.tablesLimit = planLimits.tablesLimit;
      subscription.usage.staffLimit = planLimits.staffLimit;
      subscription.usage.bookingsLimit = planLimits.bookingsLimit;
      subscription.usage.apiCallsLimit = planLimits.apiCallsLimit;
      subscription.usage.storageLimit = planLimits.storageLimit;
      
      // Update features
      subscription.features = planLimits.features;
      
      // If upgrading, extend subscription period
      if (getPlanPrice(oldPlanType) < pricing.price) {
        subscription.endDate = new Date(Date.now() + (subscription.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
      }
      
      await subscription.save();

      // CRITICAL FIX: Update restaurant limits to match subscription for all restaurants owned by organization members
      const Restaurant = await import('@/models/Restaurants').then(mod => mod.default);
      // planLimits is already available from the above if/else block
      
      // Get all member user IDs from the organization
      const memberIds = organization.members.map(member => member.userId);
      
      // Update all restaurants owned by organization members
      await Restaurant.updateMany(
        { ownerId: { $in: memberIds } },
        {
          $set: {
            'limits.floorPlansLimit': planLimits.floorPlansLimit,
            'limits.tablesLimit': planLimits.tablesLimit,
            'limits.staffLimit': planLimits.staffLimit,
            'limits.bookingsLimit': planLimits.bookingsLimit,
            'limits.apiCallsLimit': planLimits.apiCallsLimit,
            'limits.storageLimit': planLimits.storageLimit,
            'features': planLimits.features
          }
        }
      );

      console.log(`Updated restaurant limits for organization ${organization._id} to match ${planType} plan:`, planLimits);

      // Track subscription update
      await UsageAnalytics.trackEvent({
        organizationId: organization._id,
        userId,
        eventType: 'subscription_updated',
        eventData: {
          featureName: 'plan_change',
          featureData: {
            fromPlan: oldPlanType,
            toPlan: planType,
            billingCycle: subscription.billingCycle,
            price: pricing.price
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: subscription,
      message: `Successfully ${subscription.planType === 'free' ? 'downgraded to' : 'upgraded to'} ${planType} plan`
    });

  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}

// Helper function to get plan pricing
function getPlanPricing(planType, billingCycle) {
  const pricing = {
    free: { price: 0, currency: 'THB' },
    basic: { price: billingCycle === 'yearly' ? 12000 : 1200, currency: 'THB' },
    business: { price: billingCycle === 'yearly' ? 28000 : 2800, currency: 'THB' },
    professional: { price: billingCycle === 'yearly' ? 55000 : 5500, currency: 'THB' },
    enterprise: { price: billingCycle === 'yearly' ? 120000 : 12000, currency: 'THB' }
  };
  
  return pricing[planType] || pricing.free;
}

// Helper function to get plan price for comparison
function getPlanPrice(planType) {
  const pricing = {
    free: 0,
    basic: 1200,
    business: 2800,
    professional: 5500,
    enterprise: 12000
  };
  
  return pricing[planType] || 0;
}
