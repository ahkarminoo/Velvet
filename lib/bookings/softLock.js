import TableLock from '@/models/TableLock';
import Booking from '@/models/Booking';
import { hasOverlap } from '@/lib/time';
import { checkBookingLimit } from './limits';
import { BookingError, ERROR_CODES } from './errors';

/**
 * Create a soft (time-limited) lock on a table.
 *
 * Steps:
 *   1. Validate required fields
 *   2. Check the restaurant's monthly booking limit
 *   3. Check overlap with existing pending/confirmed bookings
 *   4. Check overlap with other users' active locks
 *   5. Insert the lock
 *
 * On lock-insert race (unique-index collision) → CONCURRENT_LOCK.
 * Returns { lock: { lockId, tableId, expiresAt, holdDurationMinutes, status } }.
 */
export async function createSoftLock({
    user,
    restaurantId,
    tableId,
    date,
    startTime,
    endTime,
    guestCount,
    holdDurationMinutes = 5,
}) {
    if (!user) {
        throw new BookingError(ERROR_CODES.UNAUTHORIZED, 'User required');
    }
    if (!restaurantId || !tableId || !date || !startTime || !endTime || !guestCount) {
        throw new BookingError(ERROR_CODES.MISSING_FIELDS, 'Missing required fields');
    }

    const limitCheck = await checkBookingLimit(restaurantId);
    if (!limitCheck.allowed) {
        throw new BookingError(
            ERROR_CODES.LIMIT_REACHED,
            'Monthly booking limit reached',
            {
                limit: limitCheck.limit,
                currentUsage: limitCheck.currentUsage,
                currentPlan: limitCheck.currentPlan,
            },
        );
    }

    const lockDate = new Date(date);
    lockDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(lockDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

    const dayBookings = await Booking.find({
        restaurantId,
        tableId,
        date: { $gte: lockDate, $lt: nextDate },
        status: { $in: ['pending', 'confirmed'] },
    }).select('_id status customerName startTime endTime');

    const conflictingBooking = dayBookings.find((b) =>
        hasOverlap(b.startTime, b.endTime, startTime, endTime),
    );

    if (conflictingBooking) {
        throw new BookingError(
            ERROR_CODES.BOOKING_CONFLICT,
            'Table is already booked for this time slot',
            {
                conflict: {
                    type: 'booking',
                    bookingId: conflictingBooking._id,
                    status: conflictingBooking.status,
                    startTime: conflictingBooking.startTime,
                    endTime: conflictingBooking.endTime,
                },
            },
        );
    }

    const dayActiveLocks = await TableLock.find({
        restaurantId,
        tableId,
        date: { $gte: lockDate, $lt: nextDate },
        status: 'active',
        expiresAt: { $gt: new Date() },
    }).select('_id lockId expiresAt userId startTime endTime');

    const conflictingLock = dayActiveLocks.find((l) =>
        hasOverlap(l.startTime, l.endTime, startTime, endTime),
    );

    if (conflictingLock) {
        throw new BookingError(
            ERROR_CODES.LOCK_CONFLICT,
            'Table is currently locked by another user',
            {
                conflict: {
                    type: 'lock',
                    lockId: conflictingLock.lockId,
                    expiresAt: conflictingLock.expiresAt,
                    startTime: conflictingLock.startTime,
                    endTime: conflictingLock.endTime,
                    lockedBy:
                        conflictingLock.userId.toString() === user._id.toString()
                            ? 'self'
                            : 'other',
                },
            },
        );
    }

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
            customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
            customerEmail: user.email,
            customerPhone: user.contactNumber || 'Not provided',
            pricing: { finalPrice: 0 }, // placeholder; real price is set at confirm time
        },
    });

    try {
        await tableLock.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new BookingError(
                ERROR_CODES.CONCURRENT_LOCK,
                'Table was locked by another user while processing your request',
            );
        }
        throw error;
    }

    return {
        lock: {
            lockId: tableLock.lockId,
            tableId: tableLock.tableId,
            expiresAt: tableLock.expiresAt,
            holdDurationMinutes,
            status: tableLock.status,
        },
    };
}
