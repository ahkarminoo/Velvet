import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import { verifyAdminAuth } from '@/lib/adminAuth';

// Get all subscriptions with filtering and pagination
export async function GET(req) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const status = searchParams.get('status');
    const planType = searchParams.get('planType');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (planType) filter.planType = planType;
    if (search) {
      filter.$or = [
        { 'restaurantId': { $regex: search, $options: 'i' } },
        { 'ownerId.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('restaurantId', 'restaurantName contactNumber')
        .populate('ownerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscription.countDocuments(filter)
    ]);
    
    return NextResponse.json({
      success: true,
      data: subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
