import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Restaurant from '@/models/Restaurants';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const timeRange = searchParams.get('timeRange'); // today, week, month

    // Validate restaurantId
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

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
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify restaurant ownership
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: decoded.userId
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or unauthorized' },
        { status: 403 }
      );
    }

    // Build query based on filters
    const query = { restaurantId };

    // Handle date filtering
    try {
      if (timeRange) {
        const now = new Date();
        switch (timeRange) {
          case 'today':
            query.date = {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999))
            };
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            query.date = { $gte: weekStart, $lte: weekEnd };
            break;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: monthStart, $lte: monthEnd };
            break;
          default:
            if (date) {
              const startDate = new Date(date);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(date);
              endDate.setHours(23, 59, 59, 999);
              query.date = { $gte: startDate, $lte: endDate };
            }
        }
      } else if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };
      }
    } catch (error) {
      console.error('Date parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    // Find all bookings for the restaurant based on filters
    const bookings = await Booking.find(query)
      .sort({ date: 1, startTime: 1 });

    // Calculate statistics
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      totalGuests: bookings.reduce((sum, b) => sum + (b.guestCount || 0), 0)
    };

    return NextResponse.json({ bookings, stats });
  } catch (error) {
    console.error('Error in restaurant bookings API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
} 