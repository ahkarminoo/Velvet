import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';
import jwt from 'jsonwebtoken';

// POST /api/restaurants/[id]/floorplans/[floorplanId]/set-default - Set floorplan as default
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id, floorplanId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find restaurant to verify ownership
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - Not restaurant owner' }, { status: 403 });
    }

    // Verify floorplan exists and belongs to restaurant
    const floorplan = await Floorplan.findById(floorplanId);
    if (!floorplan || floorplan.restaurantId.toString() !== id) {
      return NextResponse.json({ error: 'Floorplan not found' }, { status: 404 });
    }

    // Remove default from all floorplans for this restaurant
    await Floorplan.updateMany(
      { restaurantId: id },
      { isDefault: false }
    );

    // Set this floorplan as default
    await Floorplan.findByIdAndUpdate(floorplanId, { isDefault: true });

    // Update restaurant's default floorplan
    await Restaurant.findByIdAndUpdate(id, { defaultFloorplanId: floorplanId });

    return NextResponse.json({ 
      message: 'Default floorplan updated successfully',
      defaultFloorplanId: floorplanId
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
