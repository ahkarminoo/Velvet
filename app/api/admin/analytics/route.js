import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';
import Restaurant from '@/models/Restaurants';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import Organization from '@/models/Organization';
import Subscription from '@/models/Subscription';
import UsageAnalytics from '@/models/UsageAnalytics';
import { verifyAdminAuth } from '@/lib/adminAuth';

// Get comprehensive analytics
export async function GET(req) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    // Get basic counts
    const [
      totalUsers,
      totalRestaurants,
      totalBookings,
      totalReviews,
      totalOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      recentUsers,
      recentBookings,
      revenueData,
      usageStats
    ] = await Promise.all([
      User.countDocuments(),
      Restaurant.countDocuments(),
      Booking.countDocuments(),
      Review.countDocuments(),
      Organization.countDocuments(),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      
      // Recent activity
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Booking.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Revenue analytics
      Subscription.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$planType',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        }
      ]),
      
      // Usage statistics
      UsageAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(startDate);
    previousPeriodStart.setTime(previousPeriodStart.getTime() - (endDate.getTime() - startDate.getTime()));
    
    const [
      previousUsers,
      previousBookings
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } }),
      Booking.countDocuments({ createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } })
    ]);
    
    const userGrowth = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers * 100) : 0;
    const bookingGrowth = previousBookings > 0 ? ((recentBookings - previousBookings) / previousBookings * 100) : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalRestaurants,
          totalBookings,
          totalReviews,
          totalOrganizations,
          totalSubscriptions,
          activeSubscriptions,
          userGrowth: Math.round(userGrowth * 100) / 100,
          bookingGrowth: Math.round(bookingGrowth * 100) / 100
        },
        recent: {
          newUsers: recentUsers,
          newBookings: recentBookings
        },
        revenue: {
          byPlan: revenueData,
          totalMonthly: revenueData.reduce((sum, plan) => sum + plan.totalRevenue, 0)
        },
        usage: {
          byEventType: usageStats
        },
        period: {
          start: startDate,
          end: endDate,
          label: period
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
