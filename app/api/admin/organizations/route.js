import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { verifyAdminAuth } from '@/lib/adminAuth';

// Get all organizations with filtering and pagination
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
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .populate('subscriptionId', 'planType status price')
        .populate('members.userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(filter)
    ]);
    
    return NextResponse.json({
      success: true,
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
