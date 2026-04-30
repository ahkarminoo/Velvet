import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/models/Organization';
import Subscription from '@/models/Subscription';

// Get all organizations with filtering and pagination
export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
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
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
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

// Create new organization
export async function POST(req) {
  try {
    const { 
      name, 
      description, 
      type, 
      email, 
      phone, 
      website, 
      address, 
      ownerId 
    } = await req.json();
    
    if (!name || !email || !ownerId) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and owner ID are required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Check if organization with same name or email already exists
    const existingOrg = await Organization.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });
    
    if (existingOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization with this name or email already exists' },
        { status: 400 }
      );
    }
    
    // Create organization
    const organization = new Organization({
      name,
      description: description || '',
      type: type || 'restaurant',
      email,
      phone: phone || '',
      website: website || '',
      address: address || {},
      members: [{
        userId: ownerId,
        role: 'owner',
        permissions: [
          'manage_organization',
          'manage_subscription',
          'manage_restaurants',
          'manage_staff',
          'manage_bookings',
          'view_analytics',
          'manage_settings'
        ],
        joinedAt: new Date(),
        isActive: true
      }],
      status: 'active'
    });
    
    await organization.save();
    
    // Create default free subscription
    const freePlanLimits = Subscription.getPlanLimits('free');
    const subscription = new Subscription({
      organizationId: organization._id,
      ownerId,
      planType: 'free',
      billingCycle: 'monthly',
      price: 0,
      currency: 'THB',
      status: 'active',
      startDate: new Date(),
      usage: {
        floorPlansLimit: freePlanLimits.floorPlansLimit,
        tablesLimit: freePlanLimits.tablesLimit,
        staffLimit: freePlanLimits.staffLimit,
        bookingsLimit: freePlanLimits.bookingsLimit,
        apiCallsLimit: freePlanLimits.apiCallsLimit,
        storageLimit: freePlanLimits.storageLimit
      },
      features: freePlanLimits.features
    });
    
    await subscription.save();
    
    // Update organization with subscription reference
    organization.subscriptionId = subscription._id;
    await organization.save();
    
    return NextResponse.json({
      success: true,
      data: organization,
      message: 'Organization created successfully'
    });
    
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
