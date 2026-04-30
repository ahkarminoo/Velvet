import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Staff from '@/models/Staff';
import Restaurant from '@/models/Restaurants';
import RestaurantOwner from '@/models/restaurant-owner';

// GET - Fetch all staff members for a restaurant
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    
    if (!restaurantId) {
      return NextResponse.json({ 
        error: 'Restaurant ID is required' 
      }, { status: 400 });
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json({ 
        error: 'Restaurant not found' 
      }, { status: 404 });
    }

    // Fetch all staff members for this restaurant
    const staff = await Staff.find({ 
      restaurantId,
      isActive: true 
    }).populate('restaurantId', 'restaurantName').sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true,
      staff 
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch staff members' 
    }, { status: 500 });
  }
}

// POST - Create new staff member
export async function POST(request) {
  try {
    await dbConnect();
    
    const requestBody = await request.json();
    console.log('📨 Received request body:', requestBody);
    
    const { 
      lineId, 
      displayName, 
      restaurantId, 
      role,
      lineUserId 
    } = requestBody;

    // Validate required fields
    if (!lineId || !displayName || !restaurantId || !role) {
      return NextResponse.json({ 
        error: 'Line ID, Display Name, Restaurant ID, and Role are required' 
      }, { status: 400 });
    }

    // Verify restaurant exists with subscription
    const restaurant = await Restaurant.findById(restaurantId).populate('subscriptionId');
    if (!restaurant) {
      return NextResponse.json({ 
        error: 'Restaurant not found' 
      }, { status: 404 });
    }

    // Check SaaS staff limit
    const currentStaff = await Staff.countDocuments({ 
      restaurantId, 
      isActive: true 
    });
    
    // Get limit from restaurant.limits (current structure) or fallback to subscription
    let limit = restaurant.limits?.staffLimit;
    let currentPlan = 'free'; // default
    
    if (!limit && restaurant.subscriptionId) {
      limit = restaurant.subscriptionId.usage?.staffLimit;
      currentPlan = restaurant.subscriptionId.planType;
    }
    
    // Default to 5 for free plan if no limit is set
    if (limit === undefined || limit === null) {
      limit = 5;
    }
    
    console.log(`Staff limit check: current=${currentStaff}, limit=${limit}, restaurantId=${restaurantId}`);
    
    if (currentStaff >= limit && limit !== -1) { // -1 means unlimited
      return NextResponse.json({ 
        error: 'Staff limit reached',
        message: `You have reached your limit of ${limit} staff members. Please upgrade your plan to add more staff.`,
        currentPlan: currentPlan,
        upgradeRequired: true,
        currentUsage: currentStaff,
        limit: limit
      }, { status: 403 });
    }

    // Check if staff member with this Line ID already exists
    const existingStaff = await Staff.findOne({ lineId });
    if (existingStaff) {
      return NextResponse.json({ 
        error: 'Staff member with this Line ID already exists' 
      }, { status: 409 });
    }

    // Create new staff member
    const staffData = {
      lineId,
      displayName,
      restaurantId,
      role
    };
    
    // Add lineUserId if provided (for Line bot registrations)
    if (lineUserId) {
      staffData.lineUserId = lineUserId;
    }
    
    console.log('📝 Creating staff with data:', staffData);
    const newStaff = new Staff(staffData);

    console.log('💾 Saving staff member...');
    await newStaff.save();
    console.log('✅ Staff member saved successfully');
    await newStaff.populate('restaurantId', 'restaurantName');

    // Update SaaS usage tracking
    if (restaurant.subscriptionId) {
      await restaurant.subscriptionId.incrementUsage('staffUsed', 1);
      await restaurant.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Staff member created successfully',
      staff: newStaff 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating staff member:', error);
    return NextResponse.json({ 
      error: 'Failed to create staff member' 
    }, { status: 500 });
  }
}

// PUT - Update staff member
export async function PUT(request) {
  try {
    await dbConnect();
    
    const { 
      staffId,
      displayName, 
      role,
      isActive 
    } = await request.json();

    if (!staffId) {
      return NextResponse.json({ 
        error: 'Staff ID is required' 
      }, { status: 400 });
    }

    // Find and update staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ 
        error: 'Staff member not found' 
      }, { status: 404 });
    }

    // Update fields if provided
    if (displayName !== undefined) staff.displayName = displayName;
    if (role !== undefined) staff.role = role;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();
    await staff.populate('restaurantId', 'restaurantName');

    return NextResponse.json({ 
      success: true,
      message: 'Staff member updated successfully',
      staff 
    });

  } catch (error) {
    console.error('Error updating staff member:', error);
    return NextResponse.json({ 
      error: 'Failed to update staff member' 
    }, { status: 500 });
  }
}

// DELETE - Remove staff member (soft delete)
export async function DELETE(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    
    if (!staffId) {
      return NextResponse.json({ 
        error: 'Staff ID is required' 
      }, { status: 400 });
    }

    // Find and soft delete staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ 
        error: 'Staff member not found' 
      }, { status: 404 });
    }

    staff.isActive = false;
    await staff.save();

    return NextResponse.json({ 
      success: true,
      message: 'Staff member removed successfully' 
    });

  } catch (error) {
    console.error('Error removing staff member:', error);
    return NextResponse.json({ 
      error: 'Failed to remove staff member' 
    }, { status: 500 });
  }
}
