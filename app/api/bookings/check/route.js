import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { hasOverlap } from '@/lib/time';

export async function POST(request) {
    try {
        await dbConnect();
        const { restaurantId, date, startTime, endTime } = await request.json();

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // Find bookings for this day/table range, then filter overlaps
        const dayBookings = await Booking.find({
            restaurantId,
            date: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['pending', 'confirmed'] }
        });

        const bookings = dayBookings.filter((booking) =>
            hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
        );

        // Return the booked table IDs
        return NextResponse.json({
            bookings: bookings.map(booking => ({
                tableId: booking.tableId,
                startTime: booking.startTime,
                endTime: booking.endTime
            }))
        });

    } catch (error) {
        console.error('Error checking bookings:', error);
        return NextResponse.json(
            { error: 'Failed to check bookings' },
            { status: 500 }
        );
    }
} 
