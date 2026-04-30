import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import RestaurantOwner from '@/models/restaurant-owner';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { ownerId, newPlanType, newPrice } = await request.json();
    
    if (!ownerId || !newPlanType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find existing subscription
    let subscription = await Subscription.findOne({ ownerId });
    
    if (!subscription) {
      // Create new subscription if none exists
      const planLimits = Subscription.getPlanLimits(newPlanType);
      
      subscription = new Subscription({
        ownerId,
        planType: newPlanType,
        price: newPrice || 0,
        status: 'active',
        billingCycle: 'monthly',
        currency: 'THB',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        usage: {
          floorPlansUsed: 0,
          floorPlansLimit: planLimits.floorPlansLimit,
          tablesUsed: 0,
          tablesLimit: planLimits.tablesLimit,
          staffUsed: 0,
          staffLimit: planLimits.staffLimit,
          bookingsThisMonth: 0,
          bookingsLimit: planLimits.bookingsLimit,
          apiCallsThisMonth: 0,
          apiCallsLimit: planLimits.apiCallsLimit,
          storageUsed: 0,
          storageLimit: planLimits.storageLimit
        },
        features: planLimits.features
      });
    } else {
      // Update existing subscription
      const planLimits = Subscription.getPlanLimits(newPlanType);
      
      subscription.planType = newPlanType;
      subscription.price = newPrice || 0;
      subscription.status = 'active';
      subscription.startDate = new Date();
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      // Update limits based on new plan
      subscription.usage.floorPlansLimit = planLimits.floorPlansLimit;
      subscription.usage.tablesLimit = planLimits.tablesLimit;
      subscription.usage.staffLimit = planLimits.staffLimit;
      subscription.usage.bookingsLimit = planLimits.bookingsLimit;
      subscription.usage.apiCallsLimit = planLimits.apiCallsLimit;
      subscription.usage.storageLimit = planLimits.storageLimit;
      
      // Update features
      subscription.features = planLimits.features;
    }

    await subscription.save();

    // Update restaurant owner document if needed
    await RestaurantOwner.findByIdAndUpdate(ownerId, {
      subscriptionPlan: newPlanType.charAt(0).toUpperCase() + newPlanType.slice(1)
    });

    // CRITICAL FIX: Update restaurant limits to match subscription
    const Restaurant = await import('@/models/Restaurants').then(mod => mod.default);
    const planLimits = Subscription.getPlanLimits(newPlanType);
    
    await Restaurant.updateMany(
      { ownerId },
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

    console.log(`Updated restaurant limits for owner ${ownerId} to match ${newPlanType} plan:`, planLimits);

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${newPlanType} plan`,
      subscription: {
        planType: subscription.planType,
        price: subscription.price,
        status: subscription.status,
        features: subscription.features
      }
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
