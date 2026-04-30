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

// GET /api/venues/[id]/events — list venue events (owner: all; public param: published only)
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';
    const upcoming = searchParams.get('upcoming') === 'true';

    const query = { venueId: id };
    if (publicOnly) query.status = 'published';
    if (upcoming) query.date = { $gte: new Date() };

    const events = await Event.find(query)
      .populate('floorplanIds', 'name floorplanType')
      .populate('zoneOverrides.zoneId', 'name color type')
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({ events });
  } catch (error) {
    console.error('GET events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/venues/[id]/events — create event (owner auth)
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const decoded = verifyOwner(request, restaurant.ownerId);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, description, type, date, startTime, endTime,
      coverCharge, floorplanIds, zoneOverrides, capacity,
      images, bookingDeadline, externalTicketUrl
    } = body;

    if (!name || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'name, date, startTime, endTime are required' },
        { status: 400 }
      );
    }

    const event = await Event.create({
      venueId: id,
      name,
      description: description || '',
      type: type || 'other',
      date: new Date(date),
      startTime,
      endTime,
      coverCharge: coverCharge || 0,
      floorplanIds: floorplanIds || [],
      zoneOverrides: zoneOverrides || [],
      capacity: capacity || 0,
      images: images || [],
      status: 'draft',
      bookingDeadline: bookingDeadline ? new Date(bookingDeadline) : null,
      externalTicketUrl: externalTicketUrl || ''
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('POST event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
