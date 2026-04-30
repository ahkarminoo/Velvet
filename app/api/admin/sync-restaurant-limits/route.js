import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';

// Admin endpoint to sync restaurant limits with subscription plans
export async function POST(request) {
  try {
    await dbConnect();

    const { adminKey } = await request.json();
    
    // Simple admin key check (you should use a proper admin authentication)
    if (adminKey !== process.env.ADMIN_SYNC_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let updatedCount = 0;
    const results = [];

    // Method 1: Find restaurants through organizations with subscriptions
    const organizations = await Organization.find({}).populate('subscriptionId');
    
    for (const org of organizations) {
      if (org.subscriptionId) {
        const memberIds = org.members.map(member => member.userId);
        const restaurants = await Restaurant.find({ ownerId: { $in: memberIds } });
        
        if (restaurants.length > 0) {
          const planLimits = Subscription.getPlanLimits(org.subscriptionId.planType);
          
          const updateResult = await Restaurant.updateMany(
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

          updatedCount += updateResult.modifiedCount;
          
          results.push({
            organizationId: org._id,
            planType: org.subscriptionId.planType,
            memberCount: memberIds.length,
            restaurantsFound: restaurants.length,
            restaurantsUpdated: updateResult.modifiedCount,
            newLimits: planLimits
          });
        }
      }
    }

    // Method 2: Find restaurants with direct subscription relationships (older structure)
    const restaurantsWithSubscriptions = await Restaurant.find({ 
      subscriptionId: { $exists: true, $ne: null } 
    }).populate('subscriptionId');

    for (const restaurant of restaurantsWithSubscriptions) {
      if (restaurant.subscriptionId) {
        const planLimits = Subscription.getPlanLimits(restaurant.subscriptionId.planType);
        
        const updateResult = await Restaurant.updateOne(
          { _id: restaurant._id },
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

        if (updateResult.modifiedCount > 0) {
          updatedCount++;
          
          results.push({
            restaurantId: restaurant._id,
            restaurantName: restaurant.restaurantName,
            planType: restaurant.subscriptionId.planType,
            directSubscription: true,
            updated: true,
            newLimits: planLimits
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${updatedCount} restaurants with their subscription limits`,
      totalUpdated: updatedCount,
      details: results
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync restaurant limits', details: error.message },
      { status: 500 }
    );
  }
}
