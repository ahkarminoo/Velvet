import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Event from '@/models/Event';
import jwt from 'jsonwebtoken';

// POST /api/venues/[id]/events/[eventId]/publish
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id, eventId } = await params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.userId !== restaurant.ownerId.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await Event.findOneAndUpdate(
      { _id: eventId, venueId: id, status: 'draft' },
      { $set: { status: 'published' } },
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or already published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event, message: 'Event published successfully' });
  } catch (error) {
    console.error('Publish event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
