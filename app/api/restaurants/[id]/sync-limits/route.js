import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';
import jwt from 'jsonwebtoken';

// POST /api/restaurants/[id]/sync-limits - Sync restaurant limits with subscription
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find restaurant
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Verify ownership
    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - Not restaurant owner' }, { status: 403 });
    }

    let planLimits = null;
    let planType = 'free';
    let syncSource = 'default';

    // Method 1: Try to find subscription through organization
    const organization = await Organization.findOne({ 
      'members.userId': decoded.userId 
    }).populate('subscriptionId');

    if (organization && organization.subscriptionId) {
      planLimits = Subscription.getPlanLimits(organization.subscriptionId.planType);
      planType = organization.subscriptionId.planType;
      syncSource = 'organization';
    }
    // Method 2: Try direct subscription relationship (older structure)
    else if (restaurant.subscriptionId) {
      const subscription = await Subscription.findById(restaurant.subscriptionId);
      if (subscription) {
        planLimits = Subscription.getPlanLimits(subscription.planType);
        planType = subscription.planType;
        syncSource = 'direct';
      }
    }
    // Method 3: Find any subscription for this user
    else {
      const subscription = await Subscription.findOne({ ownerId: decoded.userId });
      if (subscription) {
        planLimits = Subscription.getPlanLimits(subscription.planType);
        planType = subscription.planType;
        syncSource = 'owner';
      }
    }

    // If no subscription found, use free plan defaults
    if (!planLimits) {
      planLimits = Subscription.getPlanLimits('free');
      planType = 'free';
      syncSource = 'default_free';
    }

    // Store old limits for comparison
    const oldLimits = {
      floorPlansLimit: restaurant.limits?.floorPlansLimit,
      tablesLimit: restaurant.limits?.tablesLimit,
      staffLimit: restaurant.limits?.staffLimit,
      bookingsLimit: restaurant.limits?.bookingsLimit,
      apiCallsLimit: restaurant.limits?.apiCallsLimit,
      storageLimit: restaurant.limits?.storageLimit
    };

    // Update restaurant limits
    const updateResult = await Restaurant.updateOne(
      { _id: id },
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

    console.log(`Synced restaurant ${id} limits:`, {
      oldLimits,
      newLimits: planLimits,
      planType,
      syncSource,
      modified: updateResult.modifiedCount
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced restaurant limits with ${planType} plan`,
      syncDetails: {
        restaurantId: id,
        restaurantName: restaurant.restaurantName,
        planType,
        syncSource,
        oldLimits,
        newLimits: planLimits,
        changes: {
          floorPlansLimit: `${oldLimits.floorPlansLimit} → ${planLimits.floorPlansLimit}`,
          tablesLimit: `${oldLimits.tablesLimit} → ${planLimits.tablesLimit}`,
          staffLimit: `${oldLimits.staffLimit} → ${planLimits.staffLimit}`,
          bookingsLimit: `${oldLimits.bookingsLimit} → ${planLimits.bookingsLimit}`,
          apiCallsLimit: `${oldLimits.apiCallsLimit} → ${planLimits.apiCallsLimit}`,
          storageLimit: `${oldLimits.storageLimit} → ${planLimits.storageLimit}`
        },
        updated: updateResult.modifiedCount > 0
      }
    });

  } catch (error) {
    console.error('Sync limits error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
