import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';
import jwt from 'jsonwebtoken';

// GET /api/restaurants/[id]/floorplans - Get all floorplans for a restaurant
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find restaurant and populate floorplans
    const restaurant = await Restaurant.findById(id).populate('floorplans');
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Verify ownership
    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - Not restaurant owner' }, { status: 403 });
    }

    return NextResponse.json({ 
      floorplans: restaurant.floorplans,
      defaultFloorplanId: restaurant.defaultFloorplanId
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/restaurants/[id]/floorplans - Create a new floorplan for a restaurant
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

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Floorplan name is required' }, { status: 400 });
    }

    // Find restaurant with subscription
    const restaurant = await Restaurant.findById(id).populate('subscriptionId');
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Verify ownership
    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - Not restaurant owner' }, { status: 403 });
    }

    // Check SaaS floorplan limit
    const currentFloorPlans = await Floorplan.countDocuments({ restaurantId: id });
    
    // Get limit from restaurant.limits (current structure) or fallback to subscription
    let limit = restaurant.limits?.floorPlansLimit;
    let currentPlan = 'free'; // default
    
    if (!limit && restaurant.subscriptionId) {
      limit = restaurant.subscriptionId.usage?.floorPlansLimit;
      currentPlan = restaurant.subscriptionId.planType;
    }
    
    // Default to 1 for free plan if no limit is set
    if (limit === undefined || limit === null) {
      limit = 1;
    }
    
    console.log(`Floorplan limit check: current=${currentFloorPlans}, limit=${limit}, restaurantId=${id}`);
    
    if (currentFloorPlans >= limit && limit !== -1) { // -1 means unlimited
      return NextResponse.json({ 
        error: 'Floor plan limit reached',
        message: `You have reached your limit of ${limit} floor plans. Please upgrade your plan to add more.`,
        currentPlan: currentPlan,
        upgradeRequired: true,
        currentUsage: currentFloorPlans,
        limit: limit
      }, { status: 403 });
    }

    // Check if this is the first floorplan (should be default)
    const isFirstFloorplan = !restaurant.floorplans || restaurant.floorplans.length === 0;

    // Create new floorplan
    const floorplan = new Floorplan({
      name: data.name,
      restaurantId: id,
      isDefault: isFirstFloorplan || data.isDefault || false,
      screenshotUrl: data.screenshotUrl || '',
      data: {
        objects: data.data?.objects || [],
        version: data.data?.version || 1
      }
    });

    await floorplan.save();

    // Add floorplan to restaurant
    await Restaurant.findByIdAndUpdate(id, {
      $push: { floorplans: floorplan._id },
      ...(isFirstFloorplan && { defaultFloorplanId: floorplan._id })
    });

    // Update SaaS usage tracking
    if (restaurant.subscriptionId) {
      await restaurant.subscriptionId.incrementUsage('floorPlansUsed', 1);
      await restaurant.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
    }

    return NextResponse.json({
      message: "Floorplan created successfully",
      floorplan
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
