import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import User from '@/models/user';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

// GET endpoint for fetching customer bookings
export async function GET(request) {
    try {
      await dbConnect();
  
      // Verify Firebase authentication
      const authResult = await verifyFirebaseAuth(request);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 });
      }

      const { firebaseUid } = authResult;

      // Find user by Firebase UID
      const user = await User.findOne({ firebaseUid });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
  
      // Find all bookings for this user
      const bookings = await Booking.find({ userId: user._id })
        .populate('restaurantId', 'restaurantName')
        .sort({ date: -1 });
  
      // Transform bookings to include restaurant name
      const transformedBookings = bookings.map(booking => ({
        _id: booking._id,
        restaurantId: booking.restaurantId._id,
        restaurantName: booking.restaurantId.restaurantName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestCount: booking.guestCount,
        tableId: booking.tableId,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      }));
  
      return NextResponse.json({ bookings: transformedBookings });
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }
  }

// PUT endpoint for cancelling a booking
export async function PUT(request) {
  try {
    await dbConnect();

    // Get booking ID from request body
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ 
        error: "Booking ID is required" 
      }, { status: 400 });
    }

    // Verify Firebase authentication
    const authResult = await verifyFirebaseAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { firebaseUid } = authResult;

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find and update the booking
    const booking = await Booking.findOne({ 
      _id: bookingId,
      userId: user._id 
    });

    if (!booking) {
      return NextResponse.json({ 
        error: "Booking not found or unauthorized" 
      }, { status: 404 });
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ 
        message: "Booking is already cancelled",
        booking 
      });
    }

    booking.status = 'cancelled';
    booking.addToHistory('cancelled', {
      reason: 'Customer cancelled'
    });

    await booking.save();

    return NextResponse.json({ 
      message: "Booking cancelled successfully",
      booking 
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
} 

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
        { error: 'Failed to delete booking' },
        { status: 500 }
      );
    }
  }