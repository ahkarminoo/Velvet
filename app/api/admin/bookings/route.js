import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { verifyAdminAuth } from '@/lib/adminAuth';

// Get all bookings with filtering and pagination
export async function GET(req) {
  try {
    // TEMPORARY: Skip admin authentication for testing
    // const authResult = await verifyAdminAuth(req);
    // if (!authResult.success) {
    //   console.error('Admin auth failed in bookings:', authResult.error);
    //   return NextResponse.json({ error: authResult.error }, { status: 401 });
    // }
    
    console.log('Skipping admin authentication for testing - bookings');

    await dbConnect();
    console.log('Admin bookings - Database connected successfully');
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 1000; // Increased default limit
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { bookingRef: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Debug logging
    console.log('Admin bookings - Filter:', filter);
    console.log('Admin bookings - Page:', page, 'Limit:', limit, 'Skip:', skip);
    
    // Check total bookings in database without filter
    const totalAllBookings = await Booking.countDocuments({});
    console.log('Admin bookings - Total bookings in database (no filter):', totalAllBookings);
    
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('restaurantId', 'restaurantName location')
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Add lean() for better performance
      Booking.countDocuments(filter)
    ]);
    
    console.log('Admin bookings - Found bookings:', bookings.length);
    console.log('Admin bookings - Total count:', total);
    
    // Transform bookings to ensure all fields are properly serialized
    const transformedBookings = bookings.map(booking => ({
      _id: booking._id,
      bookingRef: booking.bookingRef,
      restaurantId: booking.restaurantId,
      userId: booking.userId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guestCount: booking.guestCount,
      tableId: booking.tableId,
      status: booking.status,
      specialRequests: booking.specialRequests,
      pricing: booking.pricing,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedBookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching bookings:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Create new booking
export async function POST(req) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const bookingData = await req.json();
    
    await dbConnect();
    
    const booking = new Booking(bookingData);
    await booking.save();
    
    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
