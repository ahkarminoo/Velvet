import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

export async function POST(request) {
    try {
        await dbConnect();
        
        const {
            restaurantId,
            tableId,
            date,
            startTime,
            endTime,
            guestCount,
            holdDurationMinutes = 5 // Default 5 minutes hold
        } = await request.json();

        // Validate required fields
        if (!restaurantId || !tableId || !date || !startTime || !endTime || !guestCount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check SaaS booking limits
        const restaurant = await Restaurant.findById(restaurantId).populate('subscriptionId');
        if (restaurant) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyBookings = await Booking.countDocuments({
                restaurantId,
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
            
            console.log(`Booking limit check (soft-lock): current=${monthlyBookings}, limit=${limit}, restaurantId=${restaurantId}`);
            
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

        const lockDate = new Date(date);
        lockDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(lockDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const expiresAt = new Date(Date.now() + (holdDurationMinutes * 60 * 1000));

        // Check overlap with existing bookings
        const dayBookings = await Booking.find({
            restaurantId,
            tableId,
            date: { $gte: lockDate, $lt: nextDate },
            status: { $in: ['pending', 'confirmed'] }
        }).select('_id status customerName startTime endTime');

        const conflictingBooking = dayBookings.find((booking) =>
            hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
        );

        if (conflictingBooking) {
            return NextResponse.json(
                { 
                    error: 'Table is already booked for this time slot',
                    conflict: {
                        type: 'booking',
                        bookingId: conflictingBooking._id,
                        status: conflictingBooking.status,
                        startTime: conflictingBooking.startTime,
                        endTime: conflictingBooking.endTime
                    }
                },
                { status: 409 }
            );
        }

        // Check overlap with active locks
        const dayActiveLocks = await TableLock.find({
            restaurantId,
            tableId,
            date: { $gte: lockDate, $lt: nextDate },
            status: 'active',
            expiresAt: { $gt: new Date() }
        }).select('_id lockId expiresAt userId startTime endTime');

        const conflictingLock = dayActiveLocks.find((lock) =>
            hasOverlap(lock.startTime, lock.endTime, startTime, endTime)
        );

        if (conflictingLock) {
            return NextResponse.json(
                { 
                    error: 'Table is currently locked by another user',
                    conflict: {
                        type: 'lock',
                        lockId: conflictingLock.lockId,
                        expiresAt: conflictingLock.expiresAt,
                        startTime: conflictingLock.startTime,
                        endTime: conflictingLock.endTime,
                        lockedBy: conflictingLock.userId.toString() === user._id.toString() ? 'self' : 'other'
                    }
                },
                { status: 409 }
            );
        }

        // Create new lock
        const lockId = TableLock.generateLockId();
        const tableLock = new TableLock({
            lockId,
            restaurantId,
            tableId,
            userId: user._id,
            date: lockDate,
            startTime,
            endTime,
            guestCount,
            expiresAt,
            metadata: {
                customerName: `${user.firstName} ${user.lastName || ''}`.trim(),
                customerEmail: user.email,
                customerPhone: user.contactNumber || 'Not provided'
            }
        });

        await tableLock.save();

        return NextResponse.json({
            success: true,
            lock: {
                lockId: tableLock.lockId,
                tableId: tableLock.tableId,
                expiresAt: tableLock.expiresAt,
                holdDurationMinutes,
                status: tableLock.status
            },
            message: `Table locked for ${holdDurationMinutes} minutes`
        });

    } catch (error) {
        console.error('Error creating soft lock:', error);
        
        // Handle unique constraint violations (race conditions)
        if (error.code === 11000) {
            return NextResponse.json(
                { 
                    error: 'Table was locked by another user while processing your request',
                    code: 'CONCURRENT_LOCK'
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create soft lock' },
            { status: 500 }
        );
    }
}
