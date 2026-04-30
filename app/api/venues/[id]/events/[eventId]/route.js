import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Event from '@/models/Event';
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

// GET /api/venues/[id]/events/[eventId]
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id, eventId } = await params;
    const event = await Event.findOne({ _id: eventId, venueId: id })
      .populate('floorplanIds', 'name floorplanType screenshotUrl')
      .populate('zoneOverrides.zoneId', 'name color type pricing')
      .lean();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/venues/[id]/events/[eventId]
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id, eventId } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = [
      'name', 'description', 'type', 'date', 'startTime', 'endTime',
      'coverCharge', 'floorplanIds', 'zoneOverrides', 'capacity',
      'images', 'status', 'bookingDeadline', 'externalTicketUrl'
    ];
    const update = {};
    allowed.forEach(k => {
      if (body[k] !== undefined) {
        update[k] = k === 'date' || k === 'bookingDeadline'
          ? (body[k] ? new Date(body[k]) : null)
          : body[k];
      }
    });

    const event = await Event.findOneAndUpdate(
      { _id: eventId, venueId: id },
      { $set: update },
      { new: true, runValidators: true }
    ).populate('floorplanIds', 'name floorplanType')
     .populate('zoneOverrides.zoneId', 'name color type');

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    console.error('PUT event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/venues/[id]/events/[eventId]
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id, eventId } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await Event.findOneAndUpdate(
      { _id: eventId, venueId: id },
      { $set: { status: 'cancelled' } }
    );

    return NextResponse.json({ message: 'Event cancelled' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
