import { NextResponse } from 'next/server';
import dbConnect, { startSession } from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
import Booking from '@/models/Booking';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';
import User from '@/models/user';
import Restaurant from '@/models/Restaurants';

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

function inferDurationMinutes(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (Number.isNaN(start) || Number.isNaN(end)) return 120;
    let duration = end - start;
    if (duration <= 0) duration += 24 * 60;
    return duration;
}

export async function POST(request) {
    try {
        await dbConnect();
        
        const {
            lockId,
            specialRequests = '',
            pricing
        } = await request.json();

        // Validate required fields
        if (!lockId) {
            return NextResponse.json(
                { error: 'Lock ID is required' },
                { status: 400 }
            );
        }

        // Verify authentication
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

        // Find the lock
        const tableLock = await TableLock.findOne({ 
            lockId,
            userId: user._id,
            status: 'active'
        });

        if (!tableLock) {
            return NextResponse.json(
                { error: 'Lock not found or expired' },
                { status: 404 }
            );
        }

        // Check if lock is expired
        if (tableLock.isExpired()) {
            tableLock.status = 'expired';
            await tableLock.save();
            
            return NextResponse.json(
                { error: 'Lock has expired' },
                { status: 410 }
            );
        }

        // Check SaaS booking limits before confirming
        const restaurant = await Restaurant.findById(tableLock.restaurantId).populate('subscriptionId');
        if (restaurant) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyBookings = await Booking.countDocuments({
                restaurantId: tableLock.restaurantId,
                createdAt: {
                    $gte: new Date(currentYear, currentMonth, 1),
                    $lt: new Date(currentYear, currentMonth + 1, 1)
                }
            });
            
            // Get limit from restaurant.limits (current structure) or fallback to subscription
            let limit = restaurant.limits?.bookingsLimit;
            let currentPlan = 'free'; // default
            
            if (!limit && restaurant.subscriptionId) {
                limit = restaurant.subscriptionId.usage?.bookingsLimit;
                currentPlan = restaurant.subscriptionId.planType;
            }
            
            // Default to 1000 for free plan if no limit is set
            if (limit === undefined || limit === null) {
                limit = 1000;
            }
            
            console.log(`Booking limit check (confirm-lock): current=${monthlyBookings}, limit=${limit}, restaurantId=${tableLock.restaurantId}`);
            
            if (monthlyBookings >= limit && limit !== -1) { // -1 means unlimited
                return NextResponse.json({ 
                    error: 'Monthly booking limit reached',
                    message: `You have reached your monthly limit of ${limit} bookings. Please upgrade your plan to accept more bookings.`,
                    currentPlan: currentPlan,
                    upgradeRequired: true,
                    currentUsage: monthlyBookings,
                    limit: limit
                }, { status: 403 });
            }
        }

        // Start a transaction to ensure atomicity
        const session = await startSession();
        
        try {
            await session.withTransaction(async () => {
                const lockDateStart = new Date(tableLock.date);
                lockDateStart.setHours(0, 0, 0, 0);
                const lockDateEnd = new Date(lockDateStart);
                lockDateEnd.setDate(lockDateEnd.getDate() + 1);

                // Double-check for booking overlaps (race condition protection)
                const sameDayBookings = await Booking.find({
                    restaurantId: tableLock.restaurantId,
                    tableId: tableLock.tableId,
                    date: { $gte: lockDateStart, $lt: lockDateEnd },
                    status: { $in: ['pending', 'confirmed'] }
                }).select('_id startTime endTime').session(session);

                const conflictingBooking = sameDayBookings.find((booking) =>
                    hasOverlap(booking.startTime, booking.endTime, tableLock.startTime, tableLock.endTime)
                );

                if (conflictingBooking) {
                    throw new Error('Table was booked by another user while confirming lock');
                }

                // Double-check for conflicting active locks by other users
                const sameDayActiveLocks = await TableLock.find({
                    restaurantId: tableLock.restaurantId,
                    tableId: tableLock.tableId,
                    date: { $gte: lockDateStart, $lt: lockDateEnd },
                    status: 'active',
                    expiresAt: { $gt: new Date() },
                    lockId: { $ne: tableLock.lockId }
                }).select('_id lockId startTime endTime').session(session);

                const conflictingLock = sameDayActiveLocks.find((lock) =>
                    hasOverlap(lock.startTime, lock.endTime, tableLock.startTime, tableLock.endTime)
                );

                if (conflictingLock) {
                    throw new Error('Table was booked by another user while confirming lock');
                }

                // Create the booking
                const booking = new Booking({
                    restaurantId: tableLock.restaurantId,
                    tableId: tableLock.tableId,
                    userId: tableLock.userId,
                    date: tableLock.date,
                    startTime: tableLock.startTime,
                    endTime: tableLock.endTime,
                    durationMinutes: inferDurationMinutes(tableLock.startTime, tableLock.endTime),
                    guestCount: tableLock.guestCount,
                    status: 'confirmed',
                    customerName: tableLock.metadata.customerName,
                    customerEmail: tableLock.metadata.customerEmail,
                    customerPhone: tableLock.metadata.customerPhone,
                    specialRequests,
                    pricing: pricing || tableLock.metadata.pricing,
                    lockInfo: {
                        lockId: tableLock.lockId,
                        lockedAt: tableLock.lockedAt,
                        lockExpiresAt: tableLock.expiresAt
                    }
                });

                // Add initial history entry
                booking.addToHistory('created', {
                    tableId: tableLock.tableId,
                    guestCount: tableLock.guestCount,
                    startTime: tableLock.startTime,
                    endTime: tableLock.endTime,
                    fromLock: true,
                    lockId: tableLock.lockId
                });

                await booking.save({ session });

                // Update SaaS usage tracking
                if (restaurant && restaurant.subscriptionId) {
                    await restaurant.subscriptionId.incrementUsage('bookingsThisMonth', 1);
                }

                // Mark lock as confirmed
                tableLock.status = 'confirmed';
                tableLock.confirmedAt = new Date();
                await tableLock.save({ session });
            });

            // Fetch the created booking for response
            const confirmedBooking = await Booking.findOne({
                'lockInfo.lockId': lockId
            }).populate('restaurantId', 'restaurantName');

            return NextResponse.json({
                success: true,
                message: 'Booking confirmed successfully',
                booking: {
                    _id: confirmedBooking._id,
                    bookingRef: confirmedBooking.bookingRef,
                    restaurantId: confirmedBooking.restaurantId._id,
                    restaurantName: confirmedBooking.restaurantId.restaurantName,
                    tableId: confirmedBooking.tableId,
                    date: confirmedBooking.date,
                    startTime: confirmedBooking.startTime,
                    endTime: confirmedBooking.endTime,
                    guestCount: confirmedBooking.guestCount,
                    status: confirmedBooking.status,
                    customerName: confirmedBooking.customerName,
                    customerEmail: confirmedBooking.customerEmail,
                    pricing: confirmedBooking.pricing
                }
            });

        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error('Error confirming soft lock:', error);
        
        // Handle specific error cases
        if (error.message.includes('Table was booked by another user')) {
            return NextResponse.json(
                { 
                    error: 'Table was booked by another user while confirming your reservation',
                    code: 'CONCURRENT_BOOKING'
                },
                { status: 409 }
            );
        }

        // Handle unique constraint violations
        if (error.code === 11000) {
            return NextResponse.json(
                { 
                    error: 'Table is no longer available',
                    code: 'DOUBLE_BOOKING_PREVENTED'
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to confirm booking' },
            { status: 500 }
        );
    }
}
