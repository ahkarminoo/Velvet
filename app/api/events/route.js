import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';

// GET /api/events — public event listing
// Query params: venueId, type, date (YYYY-MM-DD), upcoming (true)
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const query = { status: 'published' };

    const venueId = searchParams.get('venueId');
    if (venueId) query.venueId = venueId;

    const type = searchParams.get('type');
    if (type) query.type = type;

    const dateParam = searchParams.get('date');
    if (dateParam) {
      const d = new Date(dateParam);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    } else if (searchParams.get('upcoming') === 'true') {
      query.date = { $gte: new Date() };
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = parseInt(searchParams.get('skip') || '0');

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('venueId', 'restaurantName location venueType images')
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query)
    ]);

    return NextResponse.json({ events, total, limit, skip });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
