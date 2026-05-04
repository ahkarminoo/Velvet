import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Floorplan from '@/models/Floorplan';
import jwt from 'jsonwebtoken';

// PUT /api/restaurants/[id]/floorplans/[floorplanId]/table-labels
// Body: { objectId, customName }
// Sets or clears the display name on a table object in the floorplan.
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id, floorplanId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    if (restaurant.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const floorplan = await Floorplan.findOne({ _id: floorplanId, restaurantId: id });
    if (!floorplan) return NextResponse.json({ error: 'Floorplan not found' }, { status: 404 });

    const { objectId, customName } = await request.json();
    if (!objectId) return NextResponse.json({ error: 'objectId required' }, { status: 400 });

    const objIndex = floorplan.data.objects.findIndex(o => o.objectId === objectId);
    if (objIndex === -1) return NextResponse.json({ error: 'Object not found in floorplan' }, { status: 404 });

    const obj = floorplan.data.objects[objIndex];
    if (!obj.userData) obj.userData = new Map();

    const trimmed = (customName || '').trim();
    if (trimmed) {
      obj.userData.set('customName', trimmed);
    } else {
      obj.userData.delete('customName');
    }

    floorplan.markModified('data.objects');
    await floorplan.save();

    return NextResponse.json({ message: 'Table label updated', objectId, customName: trimmed || null });
  } catch (error) {
    console.error('Error updating table label:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
