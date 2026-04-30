import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
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
        
        const {
            restaurantId,
            tableId,
            date,
            startTime,
            endTime,
            excludeLockId = null // Optional: exclude a specific lock from conflict check
        } = await request.json();

        // Validate required fields
        if (!restaurantId || !tableId || !date || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(checkDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayBookings = await Booking.find({
            restaurantId,
            tableId,
            date: { $gte: checkDate, $lt: nextDate },
            status: { $in: ['pending', 'confirmed'] },
        }).select('_id status customerName startTime endTime version');

        const dayLocks = await TableLock.find({
            restaurantId,
            tableId,
            date: { $gte: checkDate, $lt: nextDate },
            status: 'active',
            expiresAt: { $gt: new Date() },
            ...(excludeLockId && { lockId: { $ne: excludeLockId } }),
        }).select('_id lockId status expiresAt userId lockedAt startTime endTime');

        const existingBookings = dayBookings.filter((booking) =>
            booking.startTime === startTime && booking.endTime === endTime
        );
        const activeLocks = dayLocks.filter((lock) =>
            lock.startTime === startTime && lock.endTime === endTime
        );

        const overlappingBookings = dayBookings.filter((booking) =>
            hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
        );
        const overlappingLocks = dayLocks.filter((lock) =>
            hasOverlap(lock.startTime, lock.endTime, startTime, endTime)
        );

        // Analyze conflicts
        const conflicts = {
            exactMatch: {
                bookings: existingBookings,
                locks: activeLocks,
                hasConflicts: existingBookings.length > 0 || activeLocks.length > 0
            },
            overlapping: {
                bookings: overlappingBookings,
                locks: overlappingLocks,
                hasConflicts: overlappingBookings.length > 0 || overlappingLocks.length > 0
            },
            summary: {
                totalConflicts: existingBookings.length + activeLocks.length + overlappingBookings.length + overlappingLocks.length,
                isAvailable: existingBookings.length === 0 && activeLocks.length === 0 && overlappingBookings.length === 0 && overlappingLocks.length === 0
            }
        };

        // Calculate availability score (0-100)
        let availabilityScore = 100;
        if (conflicts.exactMatch.hasConflicts) {
            availabilityScore -= 50; // Major conflict
        }
        if (conflicts.overlapping.hasConflicts) {
            availabilityScore -= 30; // Moderate conflict
        }

        // Add time-based availability info
        const requestDate = new Date(date);
        requestDate.setHours(0, 0, 0, 0);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const isPastDate = requestDate < todayStart;
        
        if (isPastDate) {
            availabilityScore = 0;
            conflicts.summary.isAvailable = false;
        }

        return NextResponse.json({
            success: true,
            availability: {
                isAvailable: conflicts.summary.isAvailable,
                score: Math.max(0, availabilityScore),
                conflicts: conflicts,
                checkedAt: new Date(),
                requestDetails: {
                    restaurantId,
                    tableId,
                    date: checkDate,
                    startTime,
                    endTime
                }
            }
        });

    } catch (error) {
        console.error('Error checking conflicts:', error);
        return NextResponse.json(
            { error: 'Failed to check for conflicts' },
            { status: 500 }
        );
    }
}

// GET endpoint for quick availability check
export async function GET(request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');
        const tableId = searchParams.get('tableId');
        const date = searchParams.get('date');
        const startTime = searchParams.get('startTime');
        const endTime = searchParams.get('endTime');

        // Validate required fields
        if (!restaurantId || !tableId || !date || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required query parameters' },
                { status: 400 }
            );
        }

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(checkDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const [bookings, locks] = await Promise.all([
            Booking.find({
                restaurantId,
                tableId,
                date: { $gte: checkDate, $lt: nextDate },
                status: { $in: ['pending', 'confirmed'] }
            }).select('startTime endTime'),
            TableLock.find({
                restaurantId,
                tableId,
                date: { $gte: checkDate, $lt: nextDate },
                status: 'active',
                expiresAt: { $gt: new Date() }
            }).select('startTime endTime')
        ]);

        const bookingCount = bookings.filter((booking) =>
            hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
        ).length;

        const lockCount = locks.filter((lock) =>
            hasOverlap(lock.startTime, lock.endTime, startTime, endTime)
        ).length;

        const isAvailable = bookingCount === 0 && lockCount === 0;

        return NextResponse.json({
            isAvailable,
            conflicts: bookingCount + lockCount,
            checkedAt: new Date()
        });

    } catch (error) {
        console.error('Error in quick availability check:', error);
        return NextResponse.json(
            { error: 'Failed to check availability' },
            { status: 500 }
        );
    }
}
