import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';

function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;

    const trimmed = timeStr.trim();
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
        let hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2]);
        const period = twelveHourMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = Number(twentyFourHourMatch[1]);
        const minutes = Number(twentyFourHourMatch[2]);
        return hours * 60 + minutes;
    }

    return NaN;
}

function hasOverlap(startA, endA, startB, endB) {
    const aStart = timeToMinutes(startA);
    const aEnd = timeToMinutes(endA);
    const bStart = timeToMinutes(startB);
    const bEnd = timeToMinutes(endB);

    if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
    return aStart < bEnd && aEnd > bStart;
}

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
