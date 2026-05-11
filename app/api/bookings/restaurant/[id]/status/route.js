import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { changeBookingStatusAsOwner } from '@/lib/bookings/ownerStatusChange';
import { BookingError, ERROR_HTTP_STATUS } from '@/lib/bookings/errors';

function errorResponse(error) {
  if (!(error instanceof BookingError)) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking status' },
      { status: 500 },
    );
  }
  const status = ERROR_HTTP_STATUS[error.code] ?? 500;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const bookingId = params.id;
    const { status: newStatus } = await request.json();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { booking, statusChanged } = await changeBookingStatusAsOwner({
      ownerId: decoded.userId,
      bookingId,
      newStatus,
    });

    if (!statusChanged) {
      return NextResponse.json({
        message: 'Booking status is already up to date',
        booking: {
          _id: booking._id,
          status: booking.status,
          updatedAt: booking.updatedAt,
        },
      });
    }

    return NextResponse.json({
      message: 'Booking status updated successfully',
      booking: {
        _id: booking._id,
        status: booking.status,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
