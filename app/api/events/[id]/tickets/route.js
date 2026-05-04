import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

// POST /api/events/[id]/tickets — requires Firebase auth
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const authResult = await verifyFirebaseAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Sign in required to get tickets' }, { status: 401 });
    }
    const userId = authResult.uid;

    const body = await request.json();
    const { guestName, guestEmail, quantity = 1, attendanceType = 'ga', tableBookingId } = body;

    if (!guestName?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const event = await Event.findOne({ _id: id, status: 'published' });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (event.capacity > 0) {
      const remaining = event.capacity - event.currentBookings;
      if (quantity > remaining) {
        return NextResponse.json({ error: `Only ${remaining} spots remaining` }, { status: 400 });
      }
    }

    const ticket = await Ticket.create({
      eventId: event._id,
      venueId: event.venueId,
      userId,
      guestName: guestName.trim(),
      guestEmail: guestEmail?.trim() || '',
      quantity,
      attendanceType,
      tableBookingId: tableBookingId || null,
      coverCharge: event.coverCharge || 0,
    });

    await Event.findByIdAndUpdate(id, { $inc: { currentBookings: quantity } });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('POST /api/events/[id]/tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/events/[id]/tickets — owner: list tickets for an event
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const tickets = await Ticket.find({ eventId: id, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .lean();

    const totalGuests = tickets.reduce((sum, t) => sum + t.quantity, 0);

    return NextResponse.json({ tickets, totalGuests, count: tickets.length });
  } catch (error) {
    console.error('GET /api/events/[id]/tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
