import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    console.log('Fetching restaurant with ID:', id);

    // Fetch restaurant
    const restaurant = await Restaurant.findById(id).lean();
    
    if (!restaurant) {
      console.log('Restaurant not found:', id);
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    console.log('Found restaurant:', {
      id: restaurant._id,
      name: restaurant.restaurantName,
      defaultFloorplanId: restaurant.defaultFloorplanId,
      floorplansCount: restaurant.floorplans?.length || 0
    });

    // Fetch all floorplans for this restaurant
    let allFloorplans = [];
    let defaultFloorplanData = null;
    
    if (restaurant.floorplans && restaurant.floorplans.length > 0) {
      // Get all floorplans
      allFloorplans = await Floorplan.find({
        _id: { $in: restaurant.floorplans }
      }).lean();
      
      console.log(`Found ${allFloorplans.length} floorplans for restaurant`);
      
      // Get default floorplan data
      if (restaurant.defaultFloorplanId) {
        const defaultFloorplan = allFloorplans.find(fp => fp._id.toString() === restaurant.defaultFloorplanId.toString());
        if (defaultFloorplan) {
          console.log('Found default floorplan with objects:', defaultFloorplan.data.objects.length);
          defaultFloorplanData = defaultFloorplan.data;
        }
      } else if (allFloorplans.length > 0) {
        // If no default set, use the first one
        defaultFloorplanData = allFloorplans[0].data;
        console.log('Using first floorplan as default');
      }
    }

    // Prepare the response object - IMPORTANT: Include contactNumber here
    const responseData = {
      _id: restaurant._id,
      floorplanId: restaurant.defaultFloorplanId,
      floorplanData: defaultFloorplanData,
      // New: Include all floorplans for selection
      allFloorplans: allFloorplans.map(fp => ({
        _id: fp._id,
        name: fp.name,
        isDefault: fp._id.toString() === restaurant.defaultFloorplanId?.toString(),
        data: fp.data,
        screenshotUrl: fp.screenshotUrl
      })),
      defaultFloorplanId: restaurant.defaultFloorplanId,
      restaurantName: restaurant.restaurantName,
      description: restaurant.description,
      location: restaurant.location,
      rating: restaurant.rating,
      openingHours: restaurant.openingHours,
      phone: restaurant.phone,
      cuisine: restaurant.cuisineType,
      images: restaurant.images,
      contactNumber: restaurant.contactNumber,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt
    };

    console.log("DEBUG - API: Response prepared with contact number:", responseData.contactNumber || "NOT SET");
    
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error in public-floorplan route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 