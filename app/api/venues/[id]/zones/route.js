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

// GET /api/venues/[id]/zones — list zones, optionally filtered by floorplanId
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const floorplanId = searchParams.get('floorplanId');

    const query = { restaurantId: id, isActive: true };
    if (floorplanId) query.floorplanId = floorplanId;

    const zones = await Zone.find(query).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ zones });
  } catch (error) {
    console.error('GET zones error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/venues/[id]/zones — create a zone (owner auth)
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, type, color, tableIds, floorplanId, pricing } = body;

    if (!name || !floorplanId) {
      return NextResponse.json({ error: 'name and floorplanId are required' }, { status: 400 });
    }

    const zone = await Zone.create({
      restaurantId: id,
      floorplanId,
      name,
      type: type || 'standard',
      color: color || '#C9A84C',
      tableIds: tableIds || [],
      pricing: pricing || {}
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    console.error('POST zone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
