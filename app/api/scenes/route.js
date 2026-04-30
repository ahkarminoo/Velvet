import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Floorplan from '@/models/Floorplan';
import Restaurant from '@/models/Restaurants';
import jwt from 'jsonwebtoken';

// GET /api/scenes - Get all scenes
export async function GET() {
  try {
    await dbConnect();
    const scenes = await Floorplan.find({}).sort({ createdAt: -1 });
    return NextResponse.json(scenes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/scenes - Create new scene
export async function POST(request) {
  try {
    await dbConnect();
    
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: "Unauthorized - Invalid token format" 
      }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const ownerId = decoded.userId;

      if (!ownerId) {
        return NextResponse.json({ 
          error: "Unauthorized - Invalid token payload" 
        }, { status: 401 });
      }

      const data = await request.json();
      
      // Validate minimum required fields
      if (!data.restaurantId) {
        return NextResponse.json(
          { error: 'Missing restaurant ID' },
          { status: 400 }
        );
      }

      // Find restaurant with subscription for SaaS limits
      const restaurant = await Restaurant.findById(data.restaurantId).populate('subscriptionId');
      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        );
      }

      // Check SaaS floorplan limit
      const currentFloorPlans = await Floorplan.countDocuments({ restaurantId: data.restaurantId });
      
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
      
      console.log(`Floorplan limit check (scenes): current=${currentFloorPlans}, limit=${limit}, restaurantId=${data.restaurantId}`);
      
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

      // Create floorplan with minimal required data
      const floorplan = new Floorplan({
        name: data.name || "Restaurant Floor Plan",
        restaurantId: data.restaurantId,
        ownerId: ownerId,
        screenshotUrl: data.screenshotUrl || '',
        data: {
          objects: data.data?.objects || [],
          version: data.data?.version || 1
        }
      });

      await floorplan.save();

      // Update restaurant with floorplan ID
      const isFirstFloorplan = !restaurant.floorplans || restaurant.floorplans.length === 0;
      
      await Restaurant.findByIdAndUpdate(
        data.restaurantId,
        {
          $push: { floorplans: floorplan._id },
          ...(isFirstFloorplan && { defaultFloorplanId: floorplan._id })
        }
      );

      // Update SaaS usage tracking
      if (restaurant.subscriptionId) {
        await restaurant.subscriptionId.incrementUsage('floorPlansUsed', 1);
        await restaurant.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
      }

      return NextResponse.json({
        message: "Floorplan created successfully",
        floorplan
      });

    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ 
        error: "Unauthorized - Token verification failed"
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: "Internal server error"
    }, { status: 500 });
  }
} 