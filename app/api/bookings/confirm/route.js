import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Staff from '@/models/Staff';
import { notifyCustomerOfBookingConfirmation, notifyCustomerOfBookingRejection } from '@/lib/lineNotificationService';

// POST /api/bookings/confirm - Confirm or reject a booking
export async function POST(request) {
  try {
    await dbConnect();
    
    const { bookingId, action, staffId, reason } = await request.json();
    
    if (!bookingId || !action || !staffId) {
      return NextResponse.json({ 
        error: 'Missing required fields: bookingId, action, staffId' 
      }, { status: 400 });
    }
    
    if (!['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "confirm" or "reject"' 
      }, { status: 400 });
    }

    // Get booking
    const booking = await Booking.findById(bookingId).populate('restaurantId', 'restaurantName');
    if (!booking) {
      return NextResponse.json({ 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ 
        error: `Booking is already ${booking.status}` 
      }, { status: 400 });
    }

    // Get staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ 
        error: 'Staff member not found' 
      }, { status: 404 });
    }

    // Check permissions
    if (action === 'confirm' && !staff.permissions.canUpdateBookings) {
      return NextResponse.json({ 
        error: 'Staff member does not have permission to confirm bookings' 
      }, { status: 403 });
    }

    if (action === 'reject' && !staff.permissions.canCancelBookings) {
      return NextResponse.json({ 
        error: 'Staff member does not have permission to reject bookings' 
      }, { status: 403 });
    }

    // Update booking status
    if (action === 'confirm') {
      booking.status = 'confirmed';
      booking.addToHistory('confirmed', {
        staffId: staff._id,
        staffName: staff.displayName,
        confirmedAt: new Date()
      });
      
      // Send confirmation to customer
      try {
        console.log('📤 Attempting to send customer confirmation notification...');
        const notificationResult = await notifyCustomerOfBookingConfirmation(booking, staff);
        console.log('📤 Notification result:', notificationResult);
      } catch (notificationError) {
        console.error('❌ Failed to send customer confirmation:', notificationError);
        console.error('❌ Notification error details:', {
          message: notificationError.message,
          stack: notificationError.stack
        });
      }
      
    } else if (action === 'reject') {
      booking.status = 'cancelled';
      booking.addToHistory('rejected', {
        staffId: staff._id,
        staffName: staff.displayName,
        rejectedAt: new Date(),
        reason: reason || 'Rejected by staff'
      });
      
      // Send rejection notification to customer
      try {
        await notifyCustomerOfBookingRejection(booking, staff, reason);
      } catch (notificationError) {
        console.error('Failed to send customer rejection notification:', notificationError);
      }
    }

    await booking.save();

    const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${action}ed successfully`,
      booking: {
        id: booking._id,
        bookingRef: booking.bookingRef,
        customerName: booking.customerName,
        date: bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestCount: booking.guestCount,
        tableId: booking.tableId,
        status: booking.status,
        restaurantName: booking.restaurantId?.restaurantName
      },
      staff: {
        id: staff._id,
        displayName: staff.displayName,
        role: staff.role
      },
      action: action
    });

  } catch (error) {
    console.error(`Error ${action}ing booking:`, error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/bookings/confirm - Get pending bookings for a restaurant
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const staffId = searchParams.get('staffId');
    
    if (!restaurantId || !staffId) {
      return NextResponse.json({ 
        error: 'Missing restaurantId or staffId parameter' 
      }, { status: 400 });
    }

    // Verify staff member
    const staff = await Staff.findById(staffId);
    if (!staff || staff.restaurantId.toString() !== restaurantId) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }

    if (!staff.permissions.canViewBookings) {
      return NextResponse.json({ 
        error: 'Staff member does not have permission to view bookings' 
      }, { status: 403 });
    }

    // Get pending bookings for the restaurant
    const pendingBookings = await Booking.find({
      restaurantId: restaurantId,
      status: 'pending'
    })
    .populate('restaurantId', 'restaurantName')
    .populate('userId', 'firstName lastName lineUserId')
    .sort({ createdAt: -1 })
    .limit(50);

    const formattedBookings = pendingBookings.map(booking => ({
      id: booking._id,
      bookingRef: booking.bookingRef,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guestCount: booking.guestCount,
      tableId: booking.tableId,
      status: booking.status,
      createdAt: booking.createdAt,
      pricing: booking.pricing,
      isLineCustomer: !!booking.userId?.lineUserId,
      restaurantName: booking.restaurantId?.restaurantName
    }));

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
      total: formattedBookings.length,
      restaurant: {
        id: restaurantId,
        name: formattedBookings[0]?.restaurantName || 'Unknown'
      },
      staff: {
        id: staff._id,
        displayName: staff.displayName,
        role: staff.role,
        permissions: staff.permissions
      }
    });

  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
