import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import jwt from 'jsonwebtoken';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const bookingId = params.id;

    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (booking.userId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Not the owner of this booking' },
        { status: 403 }
      );
    }

    // Only allow deletion of cancelled or completed bookings
    if (!['cancelled', 'completed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Only cancelled or completed bookings can be deleted' },
        { status: 400 }
      );
    }

    await Booking.findByIdAndDelete(bookingId);

    return NextResponse.json({ 
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete booking' },
      { status: 500 }
    );
  }
} 