import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import '@/models/Restaurants';
import '@/models/Floorplan';
import '@/models/Zone';

// GET /api/events/[id] — public event detail
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const event = await Event.findOne({ _id: id, status: 'published' })
      .populate('venueId', 'restaurantName location venueType images venueSettings contactNumber')
      .populate('floorplanIds', 'name floorplanType screenshotUrl')
      .populate('zoneOverrides.zoneId', 'name color type pricing')
      .lean();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    console.error('GET /api/events/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
