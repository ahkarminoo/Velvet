import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';

// Get current user's subscription
export async function GET(req) {
  try {
    // Get user from JWT token (you'll need to implement this based on your auth system)
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Decode JWT token to get user ID
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

    // Find subscription
    const subscription = await Subscription.findOne({ organizationId: organization._id });

    if (!subscription) {
      // Return default basic plan
      const basicPlanLimits = Subscription.getPlanLimits('basic');
      return NextResponse.json({
        success: true,
        data: {
          planType: 'basic',
          status: 'active',
          price: 0,
          currency: 'THB',
          billingCycle: 'monthly',
          startDate: new Date(),
          endDate: null,
          usage: {
            floorPlansUsed: 0,
            floorPlansLimit: basicPlanLimits.floorPlansLimit,
            tablesUsed: 0,
            tablesLimit: basicPlanLimits.tablesLimit,
            staffUsed: 0,
            staffLimit: basicPlanLimits.staffLimit,
            bookingsThisMonth: 0,
            bookingsLimit: basicPlanLimits.bookingsLimit,
            apiCallsThisMonth: 0,
            apiCallsLimit: basicPlanLimits.apiCallsLimit,
            storageUsed: 0,
            storageLimit: basicPlanLimits.storageLimit
          },
          features: basicPlanLimits.features
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Error fetching current subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
