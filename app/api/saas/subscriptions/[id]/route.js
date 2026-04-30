import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';
import UsageAnalytics from '@/models/UsageAnalytics';

// Get subscription by ID
export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    await dbConnect();
    
    const subscription = await Subscription.findById(id)
      .populate('organizationId', 'name slug type status')
      .populate('ownerId', 'firstName lastName email');
    
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: subscription
    });
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// Update subscription
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const updateData = await req.json();
    
    await dbConnect();
    
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    // Handle plan upgrades/downgrades
    if (updateData.planType && updateData.planType !== subscription.planType) {
      const newPlanLimits = Subscription.getPlanLimits(updateData.planType);
      
      // Update usage limits
      subscription.usage.floorPlansLimit = newPlanLimits.floorPlansLimit;
      subscription.usage.tablesLimit = newPlanLimits.tablesLimit;
      subscription.usage.staffLimit = newPlanLimits.staffLimit;
      subscription.usage.bookingsLimit = newPlanLimits.bookingsLimit;
      subscription.usage.apiCallsLimit = newPlanLimits.apiCallsLimit;
      subscription.usage.storageLimit = newPlanLimits.storageLimit;
      
      // Update features
      subscription.features = newPlanLimits.features;
      
      // Update pricing
      const pricing = getPlanPricing(updateData.planType, subscription.billingCycle);
      subscription.price = pricing.price;
      subscription.currency = pricing.currency;
      
      // CRITICAL FIX: Update restaurant limits to match subscription
      const Restaurant = await import('@/models/Restaurants').then(mod => mod.default);
      const Organization = await import('@/models/Organization').then(mod => mod.default);
      
      // Get organization and its members
      const organization = await Organization.findById(subscription.organizationId);
      if (organization) {
        const memberIds = organization.members.map(member => member.userId);
        
        // Update all restaurants owned by organization members
        await Restaurant.updateMany(
          { ownerId: { $in: memberIds } },
          {
            $set: {
              'limits.floorPlansLimit': newPlanLimits.floorPlansLimit,
              'limits.tablesLimit': newPlanLimits.tablesLimit,
              'limits.staffLimit': newPlanLimits.staffLimit,
              'limits.bookingsLimit': newPlanLimits.bookingsLimit,
              'limits.apiCallsLimit': newPlanLimits.apiCallsLimit,
              'limits.storageLimit': newPlanLimits.storageLimit,
              'features': newPlanLimits.features
            }
          }
        );

        console.log(`Updated restaurant limits for organization ${organization._id} to match ${updateData.planType} plan:`, newPlanLimits);
      }

      // Track the plan change
      await UsageAnalytics.trackEvent({
        organizationId: subscription.organizationId,
        eventType: 'subscription_updated',
        eventData: {
          featureName: 'plan_change',
          featureData: {
            fromPlan: subscription.planType,
            toPlan: updateData.planType,
            billingCycle: subscription.billingCycle
          }
        }
      });
    }
    
    // Update other fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'planType' && subscription[key] !== undefined) {
        subscription[key] = updateData[key];
      }
    });
    
    await subscription.save();
    
    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// Cancel subscription
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const { reason, immediate = false } = await req.json();
    
    await dbConnect();
    
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    if (immediate) {
      // Immediate cancellation
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.endDate = new Date();
    } else {
      // Cancel at end of billing period
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      // Keep endDate as is for end-of-period cancellation
    }
    
    await subscription.save();
    
    // Track the cancellation
    await UsageAnalytics.trackEvent({
      organizationId: subscription.organizationId,
      eventType: 'subscription_cancelled',
      eventData: {
        featureName: 'subscription_cancellation',
        featureData: {
          planType: subscription.planType,
          reason: reason || 'No reason provided',
          immediate,
          cancelledAt: subscription.cancelledAt
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will be cancelled at the end of the billing period'
    });
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel subscription' },
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
