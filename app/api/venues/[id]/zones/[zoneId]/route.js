import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Zone from '@/models/Zone';
import jwt from 'jsonwebtoken';

function verifyOwner(request, restaurantOwnerId) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.userId !== restaurantOwnerId.toString()) return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET /api/venues/[id]/zones/[zoneId]
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id, zoneId } = await params;
    const zone = await Zone.findOne({ _id: zoneId, restaurantId: id }).lean();
    if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    return NextResponse.json({ zone });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/venues/[id]/zones/[zoneId]
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id, zoneId } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['name', 'type', 'color', 'tableIds', 'pricing', 'isActive'];
    const update = {};
    allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });

    const zone = await Zone.findOneAndUpdate(
      { _id: zoneId, restaurantId: id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });

    return NextResponse.json({ zone });
  } catch (error) {
    console.error('PUT zone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/venues/[id]/zones/[zoneId]
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id, zoneId } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await Zone.findOneAndUpdate(
      { _id: zoneId, restaurantId: id },
      { $set: { isActive: false } }
    );

    return NextResponse.json({ message: 'Zone deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
