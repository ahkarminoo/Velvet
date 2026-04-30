import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import { sendBookingConfirmationEmail } from '@/lib/email/bookingNotifications';

export async function POST(request) {
  try {
    const { restaurantId, customerEmail } = await request.json();

    if (!restaurantId || !customerEmail) {
      return NextResponse.json(
        { error: 'Restaurant ID and customer email are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get restaurant data including menu images
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Create test booking data
    const testBookingData = {
      customerName: 'Test Customer',
      customerEmail: customerEmail,
      restaurantName: restaurant.restaurantName,
      restaurantId: restaurant._id,
      date: new Date(),
      startTime: '19:00',
      endTime: '21:00',
      guestCount: 2,
      tableId: 'T1',
      bookingRef: 'TEST-' + Date.now(),
      createdAt: new Date(),
      menuImages: restaurant.images?.menu || []
    };

    // Send test email
    const result = await sendBookingConfirmationEmail(testBookingData);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailResult: result,
      restaurant: {
        name: restaurant.restaurantName,
        menuImagesCount: restaurant.images?.menu?.length || 0
      }
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
