import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import '@/models/Restaurants';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    await dbConnect();

    const authResult = await verifyFirebaseAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await Ticket.find({ userId: authResult.uid, status: { $ne: 'cancelled' } })
      .populate('eventId', 'name date startTime endTime type coverCharge')
      .populate('venueId', 'restaurantName location')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('GET /api/customer/tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
