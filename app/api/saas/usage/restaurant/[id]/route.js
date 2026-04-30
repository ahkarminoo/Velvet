import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UsageAnalytics from '@/models/UsageAnalytics';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';
import Booking from '@/models/Booking';

// Get usage analytics for a specific restaurant
export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Find the restaurant first
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Get subscription for usage limits
    const subscription = await Subscription.findOne({ restaurantId: id });
    
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found for this restaurant' }, { status: 404 });
    }
    
    // Calculate actual usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const [floorPlansCount, bookingsThisMonth, apiCallsThisMonth] = await Promise.all([
      Floorplan.countDocuments({ restaurantId: id }),
      Booking.countDocuments({ 
        restaurantId: id,
        createdAt: { $gte: currentMonth }
      }),
      // Count API calls from usage analytics
      UsageAnalytics.countDocuments({
        restaurantId: id,
        eventType: 'api_call',
        timestamp: { $gte: currentMonth }
      })
    ]);
    
    // Create usage data object
    const usageData = {
      floorPlansUsed: floorPlansCount,
      floorPlansLimit: subscription.usage.floorPlansLimit,
      tablesUsed: 0, // Will be calculated from floorplans if needed
      tablesLimit: subscription.usage.tablesLimit,
      staffUsed: 1, // At least the owner
      staffLimit: subscription.usage.staffLimit,
      bookingsThisMonth: bookingsThisMonth,
      bookingsLimit: subscription.usage.bookingsLimit,
      apiCallsThisMonth: apiCallsThisMonth,
      apiCallsLimit: subscription.usage.apiCallsLimit,
      storageUsed: 0, // Will be calculated if needed
      storageLimit: subscription.usage.storageLimit
    };
    
    // Update subscription usage
    subscription.usage.floorPlansUsed = floorPlansCount;
    subscription.usage.bookingsThisMonth = bookingsThisMonth;
    subscription.usage.apiCallsThisMonth = apiCallsThisMonth;
    await subscription.save();
    
    return NextResponse.json({
      success: true,
      data: usageData
    });
    
  } catch (error) {
    console.error('Error fetching restaurant usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
