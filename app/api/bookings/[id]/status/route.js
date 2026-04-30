import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import jwt from 'jsonwebtoken';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const bookingId = params.id;
    const { status } = await request.json();

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

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find and update the booking
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

    // Check if status is actually changing
    if (booking.status === status) {
      return NextResponse.json({ 
        message: 'Booking status is already up to date',
        booking: {
          _id: booking._id,
          status: booking.status,
          updatedAt: booking.updatedAt
        }
      });
    }

    // Store the previous status for history
    const previousStatus = booking.status;

    // Add to history only if status is actually changing
    booking.addToHistory('modified', {
      previousStatus: previousStatus,
      newStatus: status,
      updatedAt: new Date()
    });

    booking.status = status;
    await booking.save();

    return NextResponse.json({ 
      message: 'Booking status updated successfully',
      booking: {
        _id: booking._id,
        status: booking.status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking status' },
      { status: 500 }
    );
  }
} 