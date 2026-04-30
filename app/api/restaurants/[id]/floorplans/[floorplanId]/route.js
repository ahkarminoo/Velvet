import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';
import jwt from 'jsonwebtoken';

// GET /api/restaurants/[id]/floorplans/[floorplanId] - Get specific floorplan
export async function GET(request, { params }) {
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

    // Find floorplan
    const floorplan = await Floorplan.findById(floorplanId);
    if (!floorplan || floorplan.restaurantId.toString() !== id) {
      return NextResponse.json({ error: 'Floorplan not found' }, { status: 404 });
    }

    return NextResponse.json(floorplan);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/restaurants/[id]/floorplans/[floorplanId] - Update floorplan
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id, floorplanId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const data = await request.json();

    // Find restaurant to verify ownership
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - Not restaurant owner' }, { status: 403 });
    }

    // Prepare update object
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.data) updateData.data = data.data;
    if (data.screenshotUrl !== undefined) updateData.screenshotUrl = data.screenshotUrl;

    // Handle default floorplan changes
    if (data.isDefault !== undefined) {
      updateData.isDefault = data.isDefault;
      
      if (data.isDefault) {
        // Remove default from other floorplans
        await Floorplan.updateMany(
          { restaurantId: id, _id: { $ne: floorplanId } },
          { isDefault: false }
        );
        
        // Update restaurant's default floorplan
        await Restaurant.findByIdAndUpdate(id, { defaultFloorplanId: floorplanId });
      }
    }

    // Update floorplan
    const updatedFloorplan = await Floorplan.findOneAndUpdate(
      { _id: floorplanId, restaurantId: id },
      updateData,
      { new: true }
    );

    if (!updatedFloorplan) {
      return NextResponse.json({ error: 'Floorplan not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: "Floorplan updated successfully",
      floorplan: updatedFloorplan
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/restaurants/[id]/floorplans/[floorplanId] - Delete floorplan
export async function DELETE(request, { params }) {
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

    // Find floorplan to check if it's default
    const floorplan = await Floorplan.findById(floorplanId);
    if (!floorplan || floorplan.restaurantId.toString() !== id) {
      return NextResponse.json({ error: 'Floorplan not found' }, { status: 404 });
    }

    // Check if this is the only floorplan
    const floorplanCount = await Floorplan.countDocuments({ restaurantId: id });
    if (floorplanCount === 1) {
      return NextResponse.json({ 
        error: 'Cannot delete the only floorplan. Create another floorplan first.' 
      }, { status: 400 });
    }

    // If deleting default floorplan, set another one as default
    if (restaurant.defaultFloorplanId?.toString() === floorplanId) {
      const anotherFloorplan = await Floorplan.findOne({ 
        restaurantId: id, 
        _id: { $ne: floorplanId } 
      });
      
      if (anotherFloorplan) {
        await Floorplan.findByIdAndUpdate(anotherFloorplan._id, { isDefault: true });
        await Restaurant.findByIdAndUpdate(id, { defaultFloorplanId: anotherFloorplan._id });
      }
    }

    // Delete floorplan
    await Floorplan.findByIdAndDelete(floorplanId);

    // Remove from restaurant's floorplans array
    await Restaurant.findByIdAndUpdate(id, {
      $pull: { floorplans: floorplanId }
    });

    return NextResponse.json({ message: 'Floorplan deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
