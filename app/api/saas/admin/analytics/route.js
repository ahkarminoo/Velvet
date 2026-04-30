import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UsageAnalytics from '@/models/UsageAnalytics';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';
import Restaurant from '@/models/Restaurants';

// Get overall SaaS analytics
export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const organizationId = searchParams.get('organizationId');
    
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
    
    const matchStage = {
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    if (organizationId) {
      matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    
    // Get basic metrics
    const [
      totalEvents,
      totalOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      revenueData,
      usageStats,
      topOrganizations,
      dailyTrends
    ] = await Promise.all([
      // Total events
      UsageAnalytics.countDocuments(matchStage),
      
      // Total organizations
      Organization.countDocuments(),
      
      // Total subscriptions
      Subscription.countDocuments(),
      
      // Active subscriptions
      Subscription.countDocuments({ status: 'active' }),
      
      // Revenue data
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
      UsageAnalytics.getUsageStats(organizationId, startDate, endDate),
      
      // Top organizations by activity
      UsageAnalytics.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$organizationId',
            totalEvents: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $lookup: {
            from: 'organizations',
            localField: '_id',
            foreignField: '_id',
            as: 'organization'
          }
        },
        {
          $unwind: '$organization'
        },
        {
          $project: {
            organizationId: '$_id',
            organizationName: '$organization.name',
            totalEvents: 1,
            uniqueUsers: { $size: '$uniqueUsers' }
          }
        },
        { $sort: { totalEvents: -1 } },
        { $limit: 10 }
      ]),
      
      // Daily trends
      UsageAnalytics.getDailyUsageTrends(organizationId, startDate, endDate)
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(startDate);
    previousPeriodStart.setTime(previousPeriodStart.getTime() - (endDate.getTime() - startDate.getTime()));
    
    const previousPeriodEvents = await UsageAnalytics.countDocuments({
      timestamp: { $gte: previousPeriodStart, $lt: previousPeriodEnd }
    });
    
    const eventGrowth = previousPeriodEvents > 0 
      ? ((totalEvents - previousPeriodEvents) / previousPeriodEvents * 100)
      : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          totalOrganizations,
          totalSubscriptions,
          activeSubscriptions,
          eventGrowth: Math.round(eventGrowth * 100) / 100
        },
        revenue: {
          byPlan: revenueData,
          totalMonthly: revenueData.reduce((sum, plan) => sum + plan.totalRevenue, 0)
        },
        usage: {
          byEventType: usageStats,
          topOrganizations,
          dailyTrends
        },
        period: {
          start: startDate,
          end: endDate,
          label: period
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching SaaS analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Get organization-specific analytics
export async function POST(req) {
  try {
    const { organizationId, startDate, endDate } = await req.json();
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const [
      organization,
      subscription,
      usageStats,
      apiUsage,
      bookingAnalytics,
      topUsers,
      dailyTrends
    ] = await Promise.all([
      Organization.findById(organizationId),
      Subscription.findOne({ organizationId }),
      UsageAnalytics.getUsageStats(organizationId, start, end),
      UsageAnalytics.getApiUsageStats(organizationId, start, end),
      UsageAnalytics.getBookingAnalytics(organizationId, start, end),
      UsageAnalytics.getTopUsers(organizationId, start, end),
      UsageAnalytics.getDailyUsageTrends(organizationId, start, end)
    ]);
    
    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          type: organization.type,
          status: organization.status,
          memberCount: organization.activeMembers.length,
          createdAt: organization.createdAt
        },
        subscription: subscription ? {
          planType: subscription.planType,
          status: subscription.status,
          usage: subscription.usage,
          features: subscription.features,
          isActive: subscription.isActive,
          isTrial: subscription.isTrial
        } : null,
        analytics: {
          usage: usageStats,
          apiUsage,
          bookingAnalytics,
          topUsers,
          dailyTrends
        },
        period: {
          start,
          end
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching organization analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization analytics' },
      { status: 500 }
    );
  }
}
